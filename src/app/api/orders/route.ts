import { json, route } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/orders";

/**
 * GET /api/orders -> the logged-in customer's orders.
 * (Orders are created by /api/payment/create-order and confirmed by
 * /api/payment/verify or the Razorpay webhook — never directly by the browser.)
 */
export const GET = route(async (req) => {
  const user = await getCurrentUser(req);
  if (!user) return json({ orders: [] });
  return json({ orders: await listOrdersForUser(user.id) });
});
