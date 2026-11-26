import { createServer, type Server } from "node:http";
import { createHmac, randomBytes } from "node:crypto";

/**
 * A tiny fake of the Razorpay REST API (orders, payments, capture) for tests.
 * The app is pointed at it with RAZORPAY_API_BASE.
 */
export const TEST_KEY_ID = "rzp_test_mockkey123";
export const TEST_KEY_SECRET = "mock_key_secret_abcdef";
export const TEST_WEBHOOK_SECRET = "mock_webhook_secret_123";

type Order = { id: string; amount: number; currency: string; receipt: string; status: string; notes: Record<string, string> };
type Payment = { id: string; order_id: string; amount: number; currency: string; status: string; method: string };

export async function startRazorpayMock() {
  const orders = new Map<string, Order>();
  const payments = new Map<string, Payment>();
  const calls: string[] = [];
  const expectedAuth = "Basic " + Buffer.from(`${TEST_KEY_ID}:${TEST_KEY_SECRET}`).toString("base64");

  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      calls.push(`${req.method} ${req.url}`);
      const send = (status: number, data: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      };
      if (req.headers.authorization !== expectedAuth) return send(401, { error: { code: "BAD_REQUEST_ERROR", description: "auth" } });
      const url = req.url ?? "";
      if (req.method === "POST" && url === "/v1/orders") {
        const b = JSON.parse(body);
        if (!Number.isInteger(b.amount) || b.amount < 100) return send(400, { error: { code: "BAD_REQUEST_ERROR", description: "amount" } });
        const o: Order = { id: "order_" + randomBytes(7).toString("hex"), amount: b.amount, currency: b.currency, receipt: b.receipt, status: "created", notes: b.notes };
        orders.set(o.id, o);
        return send(200, o);
      }
      const pay = url.match(/^\/v1\/payments\/([^/]+)(\/capture)?$/);
      if (pay) {
        const p = payments.get(decodeURIComponent(pay[1]));
        if (!p) return send(404, { error: { code: "BAD_REQUEST_ERROR", description: "not found" } });
        if (req.method === "POST" && pay[2]) {
          p.status = "captured";
          return send(200, p);
        }
        return send(200, p);
      }
      send(404, { error: { code: "NOT_FOUND" } });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    orders,
    payments,
    calls,
    /** Simulates the customer paying in Razorpay Checkout. */
    pay(orderId: string, opts: { amount?: number; status?: string } = {}) {
      const o = orders.get(orderId)!;
      const p: Payment = { id: "pay_" + randomBytes(7).toString("hex"), order_id: orderId, amount: opts.amount ?? o.amount, currency: "INR", status: opts.status ?? "captured", method: "upi" };
      payments.set(p.id, p);
      const signature = createHmac("sha256", TEST_KEY_SECRET).update(`${orderId}|${p.id}`).digest("hex");
      return { razorpay_order_id: orderId, razorpay_payment_id: p.id, razorpay_signature: signature };
    },
    webhookBody(event: string, paymentId: string) {
      const p = payments.get(paymentId)!;
      const raw = JSON.stringify({ event, payload: { payment: { entity: { id: p.id, order_id: p.order_id, amount: p.amount, status: p.status } } } });
      const signature = createHmac("sha256", TEST_WEBHOOK_SECRET).update(raw).digest("hex");
      return { raw, signature };
    },
    stop: () => new Promise<void>((r) => server.close(() => r())),
  };
}

export function useRazorpayMockEnv(baseUrl: string) {
  process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  process.env.RAZORPAY_API_BASE = baseUrl;
}
