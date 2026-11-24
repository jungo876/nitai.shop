import { json, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/auth/session";
import { getProfile, saveProfile } from "@/server/account";
import { setupSchema } from "@/lib/validations/account";

/** POST /api/auth/setup -> saves the logged-in user's profile, business and address. */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  await enforceRateLimit("write", user.id);
  const input = await readJson(req, setupSchema);
  await saveProfile(user.id, input);
  return json({ user: await getProfile({ ...user, name: input.name, whatsapp_number: input.whatsapp_number, is_profile_complete: true }) });
});
