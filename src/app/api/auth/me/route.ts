import { json, route } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { getProfile } from "@/server/account";

/** GET /api/auth/me -> { user } (user is null when logged out; always 200). */
export const GET = route(async (req) => {
  const user = await getCurrentUser(req);
  return json({ user: user ? await getProfile(user) : null });
});
