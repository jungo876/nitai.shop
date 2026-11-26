import "server-only";
import { db, type Queryable } from "../db";
import { sessionSecret } from "../env";
import { hmacSha256Hex, randomNumericCode, safeEqualHex } from "../crypto";
import { badRequest, HttpError, tooManyRequests } from "../http";
import { log, maskPhone } from "../logger";
import { getOtpProvider, OtpProviderError } from "./otp-providers";

/**
 * Phone one-time-code login.
 *
 * Limits (enforced in the database, so they hold across server instances):
 *  - one new code per phone every RESEND_SECONDS
 *  - MAX_CODES_PER_PHONE_PER_HOUR codes per phone per hour
 *  - MAX_CODES_PER_IP_PER_HOUR codes per IP per hour
 *  - MAX_ATTEMPTS wrong guesses per code, codes expire after CODE_TTL_MINUTES
 * Codes are stored only as HMAC-SHA256(SESSION_SECRET, phone:code).
 */
export const OTP_RULES = {
  CODE_LENGTH: 6,
  CODE_TTL_MINUTES: 10,
  RESEND_SECONDS: 30,
  MAX_CODES_PER_PHONE_PER_HOUR: 5,
  MAX_CODES_PER_IP_PER_HOUR: 20,
  MAX_ATTEMPTS: 5,
} as const;

function codeHash(phone10: string, code: string) {
  return hmacSha256Hex(sessionSecret(), `${phone10}:${code}`);
}

export async function requestOtp(phone10: string, ip: string): Promise<{ resendAfterSeconds: number; expiresInSeconds: number }> {
  const sql = db();
  const [stats] = await sql`
    select
      (select count(*) from otp_challenges where phone_number = ${phone10} and created_at > now() - interval '1 hour') as phone_hour,
      (select count(*) from otp_challenges where ip = ${ip} and created_at > now() - interval '1 hour') as ip_hour,
      (select extract(epoch from (now() - max(created_at))) from otp_challenges where phone_number = ${phone10}) as since_last`;

  if (stats.since_last !== null && Number(stats.since_last) < OTP_RULES.RESEND_SECONDS) {
    throw tooManyRequests("Please wait before requesting another code.", OTP_RULES.RESEND_SECONDS - Number(stats.since_last));
  }
  if (Number(stats.phone_hour) >= OTP_RULES.MAX_CODES_PER_PHONE_PER_HOUR || Number(stats.ip_hour) >= OTP_RULES.MAX_CODES_PER_IP_PER_HOUR) {
    throw tooManyRequests("Too many codes requested. Please try again in an hour.", 3600);
  }

  const provider = getOtpProvider();
  // Any earlier unused code for this phone stops working.
  await sql`update otp_challenges set consumed_at = now() where phone_number = ${phone10} and consumed_at is null`;

  try {
    if (provider.kind === "local") {
      const code = randomNumericCode(OTP_RULES.CODE_LENGTH);
      await provider.deliver(phone10, code);
      await sql`
        insert into otp_challenges (phone_number, code_hash, provider, expires_at, max_attempts, ip)
        values (${phone10}, ${codeHash(phone10, code)}, ${provider.name},
                now() + make_interval(mins => ${OTP_RULES.CODE_TTL_MINUTES}), ${OTP_RULES.MAX_ATTEMPTS}, ${ip})`;
    } else {
      const ref = await provider.start(phone10);
      await sql`
        insert into otp_challenges (phone_number, code_hash, provider, provider_ref, expires_at, max_attempts, ip)
        values (${phone10}, null, ${provider.name}, ${ref},
                now() + make_interval(mins => ${OTP_RULES.CODE_TTL_MINUTES}), ${OTP_RULES.MAX_ATTEMPTS}, ${ip})`;
    }
  } catch (err) {
    if (err instanceof OtpProviderError) throw new HttpError(502, err.message + " Please try again shortly.", "otp_send_failed");
    throw err;
  }
  log.info("otp_requested", { phone: maskPhone(phone10), provider: provider.name });
  return { resendAfterSeconds: OTP_RULES.RESEND_SECONDS, expiresInSeconds: OTP_RULES.CODE_TTL_MINUTES * 60 };
}

/**
 * Checks a code. On success the challenge is consumed and the (possibly new)
 * user row is returned. Wrong codes count towards MAX_ATTEMPTS.
 */
export async function verifyOtp(phone10: string, code: string, tx?: Queryable): Promise<{ userId: string; isNew: boolean }> {
  if (!/^\d{6}$/.test(code)) throw badRequest("Enter the 6-digit code.");
  const sql = tx ?? db();
  const provider = getOtpProvider();

  // Lock the latest open challenge so parallel guesses cannot bypass the attempt counter.
  return sql.begin(async (t) => {
    const [challenge] = await t`
      select id, code_hash, provider, attempts, max_attempts, expires_at < now() as expired
      from otp_challenges
      where phone_number = ${phone10} and consumed_at is null
      order by created_at desc
      limit 1
      for update`;
    if (!challenge || challenge.expired) throw badRequest("This code has expired. Please request a new one.");
    if (challenge.attempts >= challenge.max_attempts) {
      throw tooManyRequests("Too many wrong attempts. Please request a new code.", OTP_RULES.RESEND_SECONDS);
    }
    await t`update otp_challenges set attempts = attempts + 1 where id = ${challenge.id}`;

    let ok: boolean;
    if (challenge.provider === "twilio" && provider.kind === "managed") {
      ok = await provider.check(phone10, code);
    } else {
      ok = !!challenge.code_hash && safeEqualHex(challenge.code_hash, codeHash(phone10, code));
    }
    if (!ok) {
      const left = challenge.max_attempts - challenge.attempts - 1;
      // Commit the attempt count, then report the error.
      return { userId: "", isNew: false, wrong: true, left } as const;
    }

    await t`update otp_challenges set consumed_at = now() where id = ${challenge.id}`;
    const [user] = await t`
      insert into users (phone_number, is_profile_complete, last_login_at)
      values (${phone10}, false, now())
      on conflict (phone_number) do update set last_login_at = now()
      returning id, (xmax = 0) as inserted`;
    return { userId: user.id as string, isNew: Boolean(user.inserted), wrong: false, left: 0 } as const;
  }).then((r) => {
    if (r.wrong) {
      throw badRequest(r.left > 0 ? `Incorrect code. ${r.left} attempt${r.left === 1 ? "" : "s"} left.` : "Incorrect code. Please request a new one.");
    }
    return { userId: r.userId, isNew: r.isNew };
  });
}
