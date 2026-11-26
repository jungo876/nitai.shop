import { HttpError, json, route } from "@/server/http";
import { log } from "@/server/logger";
import { isValidWebhookSignature } from "@/server/payments/razorpay";
import { confirmPayment } from "@/server/orders";

/**
 * POST /api/payment/webhook — called by Razorpay (server to server).
 * Configure in Razorpay Dashboard → Webhooks with events:
 *   payment.captured, order.paid, payment.failed
 * Ensures an order is confirmed even if the customer closed the browser
 * right after paying. Safe to receive the same event many times.
 */
export const POST = route(
  async (req) => {
    const raw = await req.text();
    if (raw.length > 512 * 1024) throw new HttpError(413, "Too large", "payload_too_large");
    if (!isValidWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
      log.warn("webhook_signature_invalid");
      throw new HttpError(400, "Invalid signature", "invalid_signature");
    }
    const event = JSON.parse(raw) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; error_description?: string } } };
    };
    const payment = event.payload?.payment?.entity;

    if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.id && payment.order_id) {
      try {
        await confirmPayment({ razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id, source: "webhook" });
      } catch (err) {
        // 4xx = not ours / mismatched: acknowledge so Razorpay stops retrying. 5xx: let it retry.
        if (err instanceof HttpError && err.status < 500) {
          log.warn("webhook_payment_not_confirmed", { event: event.event, status: err.status, message: err.message });
        } else {
          throw err;
        }
      }
    } else if (event.event === "payment.failed") {
      log.info("webhook_payment_failed", { orderId: payment?.order_id, reason: payment?.error_description });
    }
    return json({ ok: true });
  },
  { csrf: false } // server-to-server; authenticated by the HMAC signature instead
);
