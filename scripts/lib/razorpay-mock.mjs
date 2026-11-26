/**
 * Fake Razorpay REST API for end-to-end tests (orders, payments, capture) plus
 * a test-only endpoint POST /__test/pay that simulates a customer paying and
 * returns the signed checkout response — exactly what Razorpay Checkout would
 * hand to the browser.
 */
import { createServer } from "node:http";
import { createHmac, randomBytes } from "node:crypto";

export function startRazorpayMock({ port, keyId, keySecret }) {
  const orders = new Map();
  const payments = new Map();
  const expectedAuth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const send = (status, data) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(data));
      };
      const url = req.url ?? "";
      if (req.method === "POST" && url === "/__test/pay") {
        const { order_id, fail } = JSON.parse(body || "{}");
        const o = orders.get(order_id);
        if (!o) return send(404, { error: "unknown order" });
        const p = { id: "pay_" + randomBytes(7).toString("hex"), order_id, amount: o.amount, currency: "INR", status: fail ? "failed" : "captured", method: "upi" };
        payments.set(p.id, p);
        const signature = createHmac("sha256", keySecret).update(`${order_id}|${p.id}`).digest("hex");
        return send(200, { razorpay_order_id: order_id, razorpay_payment_id: p.id, razorpay_signature: signature, amount: o.amount });
      }
      if (req.headers.authorization !== expectedAuth) return send(401, { error: { code: "BAD_REQUEST_ERROR", description: "auth" } });
      if (req.method === "POST" && url === "/v1/orders") {
        const b = JSON.parse(body);
        const o = { id: "order_" + randomBytes(7).toString("hex"), amount: b.amount, currency: b.currency, receipt: b.receipt, status: "created", notes: b.notes };
        orders.set(o.id, o);
        return send(200, o);
      }
      const m = url.match(/^\/v1\/payments\/([^/]+)(\/capture)?$/);
      if (m) {
        const p = payments.get(decodeURIComponent(m[1]));
        if (!p) return send(404, { error: { code: "BAD_REQUEST_ERROR" } });
        if (req.method === "POST" && m[2]) p.status = "captured";
        return send(200, p);
      }
      send(404, { error: { code: "NOT_FOUND" } });
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, orders, payments })));
}
