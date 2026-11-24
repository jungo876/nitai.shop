import { route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { ordersCsv } from "@/server/admin/orders";
import { logAdminAction } from "@/server/audit";

/** GET /api/admin/export -> orders.csv (spreadsheet-safe) */
export const GET = route(async (req) => {
  const admin = await requireAdmin(req);
  const csv = await ordersCsv();
  await logAdminAction(admin.id, "CSV Export", "Orders");
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="NCK_Orders_${date}.csv"`,
      "cache-control": "no-store",
    },
  });
});
