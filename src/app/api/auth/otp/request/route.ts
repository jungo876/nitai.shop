import { clientIp, json, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requestOtp } from "@/server/auth/otp";
import { otpRequestSchema } from "@/lib/validations/account";

/** POST /api/auth/otp/request  { phone_number } -> sends a 6-digit login code. */
export const POST = route(async (req) => {
  const ip = clientIp(req);
  await enforceRateLimit("auth", ip);
  const { phone_number } = await readJson(req, otpRequestSchema);
  const result = await requestOtp(phone_number, ip);
  return json({ ok: true, ...result });
});
