import { assertUuid, forbidden, json, notFound, route } from "@/server/http";
import { requireAdmin, requireUser } from "@/server/auth/session";
import { getOrderForUser } from "@/server/orders";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { logAdminAction } from "@/server/audit";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/orders/:id -> { order, items } (only the owner can see it) */
export const GET = route<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const found = await getOrderForUser(user.id, assertUuid((await params).id, "order id"));
  if (!found) throw notFound("Order not found.");
  return json(found);
});

/** DELETE /api/orders/:id — admin test-data cleanup, disabled in production. */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  if (env().isProduction) throw forbidden("Orders cannot be deleted in production. Cancel the order instead.");
  const id = assertUuid((await params).id, "order id");
  const r = await db()`delete from orders where id = ${id}`;
  if (r.count === 0) throw notFound("Order not found.");
  await logAdminAction(admin.id, "Order Deleted (dev)", "Order", id);
  return json({ success: true });
});
