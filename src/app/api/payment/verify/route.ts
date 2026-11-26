import { json, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { requireUser } from "@/server/auth/session";
import { confirmPayment } from "@/server/orders";
import { verifyPaymentSchema } from "@/lib/validations/order";

/**
 * POST /api/payment/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Called by the checkout page after Razorpay reports success. The server
 * verifies the signature and the payment itself before confirming the order.
 */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  await enforceRateLimit("checkout", user.id);
  const body = await readJson(req, verifyPaymentSchema);
  const result = await confirmPayment({
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
    userId: user.id,
    source: "checkout",
  });
  return json({ success: true, ...result });
});
