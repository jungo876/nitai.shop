import { json, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { dashboardStats } from "@/server/admin/stats";

/** GET /api/admin/stats -> dashboard KPIs, recent orders, products needing attention */
export const GET = route(async (req) => {
  await requireAdmin(req);
  return json(await dashboardStats());
});
