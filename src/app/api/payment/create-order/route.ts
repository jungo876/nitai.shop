import { json, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/auth/session";
import { createPendingOrder } from "@/server/orders";
import { createPaymentSchema } from "@/lib/validations/order";

/**
 * POST /api/payment/create-order { payment_method: "prepaid" | "cod" }
 * Creates a pending order from the cart and the matching Razorpay order.
 * Returns what Razorpay Checkout needs to open.
 */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  await enforceRateLimit("checkout", user.id);
  const { payment_method } = await readJson(req, createPaymentSchema);
  return json(await createPendingOrder(user, payment_method), { status: 201 });
});
