import { json, route } from "@/server/http";
import { destroySession } from "@/server/auth/session";

/** POST /api/auth/logout */
export const POST = route(async (req) => {
  const res = json({ ok: true });
  await destroySession(req, res);
  return res;
});
