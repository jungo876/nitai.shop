import { z } from "zod";
import { json, parseOrThrow, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/rate-limit";
import { getAdminOrderCounts, listAdminOrders, markOrdersSeen, updateAdminOrder } from "@/server/admin/orders";
import { logAdminAction } from "@/server/audit";
import { adminUpdateOrderSchema } from "@/lib/validations/order";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/order-status";

const querySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  payment: z.enum(PAYMENT_STATUSES).optional(),
  search: z.string().trim().max(100).optional(),
  unseen: z.enum(["true", "false"]).optional(),
  abandoned: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/** GET /api/admin/orders?status=&payment=&search=&unseen=true&limit=&offset= */
export const GET = route(async (req) => {
  const admin = await requireAdmin(req);
  await enforceRateLimit("admin", admin.id);
  const q = parseOrThrow(querySchema, Object.fromEntries(req.nextUrl.searchParams));
  const [result, counts] = await Promise.all([
    listAdminOrders({
      status: q.status, payment: q.payment, search: q.search, unseenOnly: q.unseen === "true",
      includeAbandoned: q.abandoned === "true", limit: q.limit, offset: q.offset,
    }),
    getAdminOrderCounts(),
  ]);
  return json({ ...result, counts });
});

/** PATCH /api/admin/orders { order_id, order_status?, payment_status?, remaining_payment_method?, admin_notes? } */
export const PATCH = route(async (req) => {
  const admin = await requireAdmin(req);
  await enforceRateLimit("admin", admin.id);
  const input = await readJson(req, adminUpdateOrderSchema);
  const { before, after } = await updateAdminOrder(input);
  await logAdminAction(admin.id, "Order Updated", "Order", input.order_id, {
    from: { order_status: before.order_status, payment_status: before.payment_status },
    to: { order_status: after.order_status, payment_status: after.payment_status },
  });
  return json({ success: true, order: after });
});

const seenSchema = z.object({ ids: z.array(z.uuid()).max(500).optional(), all: z.boolean().optional() });

/** POST /api/admin/orders { ids: [...] } or { all: true } -> marks orders as seen (clears the "new" badge). */
export const POST = route(async (req) => {
  await requireAdmin(req);
  const { ids, all } = await readJson(req, seenSchema);
  const updated = await markOrdersSeen(all ? "all" : ids ?? []);
  return json({ success: true, updated });
});
