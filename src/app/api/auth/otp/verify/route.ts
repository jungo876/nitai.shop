import { clientIp, json, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { verifyOtp } from "@/server/auth/otp";
import { createSession, getUserById } from "@/server/auth/session";
import { getProfile } from "@/server/account";
import { otpVerifySchema } from "@/lib/validations/account";

/** POST /api/auth/otp/verify  { phone_number, code } -> logs in (sets session cookie). */
export const POST = route(async (req) => {
  const ip = clientIp(req);
  await enforceRateLimit("auth", ip);
  const { phone_number, code } = await readJson(req, otpVerifySchema);
  const { userId, isNew } = await verifyOtp(phone_number, code);
  const user = await getUserById(userId);
  if (!user) throw new Error("User vanished after OTP verification");
  const res = json({ user: await getProfile(user), isNew }, { status: isNew ? 201 : 200 });
  await createSession(res, userId, { ip, userAgent: req.headers.get("user-agent") });
  return res;
});
