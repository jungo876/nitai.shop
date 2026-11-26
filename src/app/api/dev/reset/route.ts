import { z } from "zod";
import { forbidden, json, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { logAdminAction } from "@/server/audit";

const schema = z.object({
  action: z.enum(["clear_orders", "clear_cart", "clear_wishlist", "clear_payments", "reset_demo_data"]),
});

/**
 * POST /api/dev/reset — wipes TEST data. Admin only, and refused entirely in
 * production (APP_ENV=production) so real orders can never be deleted here.
 */
export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  if (env().isProduction) throw forbidden("Development tools are disabled in production.");
  const { action } = await readJson(req, schema);
  const sql = db();
  const counts: Record<string, number> = {};
  await sql.begin(async (tx) => {
    if (action === "clear_orders" || action === "reset_demo_data") counts.orders = (await tx`delete from orders`).count;
    if (action === "clear_cart" || action === "reset_demo_data") counts.cart_items = (await tx`delete from cart_items`).count;
    if (action === "clear_wishlist" || action === "reset_demo_data") counts.wishlist_items = (await tx`delete from wishlist_items`).count;
    if (action === "clear_payments") {
      counts.orders = (await tx`
        update orders set payment_status = 'pending', razorpay_payment_id = null, razorpay_signature = null, paid_at = null
        where payment_status <> 'pending'`).count;
    }
  });
  await logAdminAction(admin.id, "Dev Tool", "System", action, counts);
  return json({ success: true, message: `Done: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ") || "nothing to change"}.`, counts });
});
