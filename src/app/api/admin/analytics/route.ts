import { badRequest, json, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { analytics } from "@/server/admin/stats";

/** GET /api/admin/analytics?range=7|30|90|all */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const range = req.nextUrl.searchParams.get("range") ?? "30";
  if (!["7", "30", "90", "365", "all"].includes(range)) throw badRequest("Invalid range.");
  return json(await analytics(range === "all" ? null : Number(range)));
});
