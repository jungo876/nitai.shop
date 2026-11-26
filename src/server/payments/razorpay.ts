import "server-only";
import { env, requireEnv } from "../env";
import { hmacSha256Hex, safeEqualHex } from "../crypto";
import { HttpError } from "../http";
import { log } from "../logger";

/**
 * Small Razorpay REST client (no SDK). RAZORPAY_API_BASE can point to a mock
 * server in tests; production uses https://api.razorpay.com.
 */

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number; // paise
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  captured?: boolean;
  error_description?: string | null;
}

function authHeader() {
  // A test key in production would let "payments" with Razorpay test cards confirm real orders.
  if (env().isProduction && requireEnv("RAZORPAY_KEY_ID").startsWith("rzp_test_")) {
    log.error("razorpay_test_key_in_production");
    throw new HttpError(503, "Online payment is not available right now. Please contact us to order.", "payment_not_configured");
  }
  return "Basic " + Buffer.from(`${requireEnv("RAZORPAY_KEY_ID")}:${requireEnv("RAZORPAY_KEY_SECRET")}`).toString("base64");
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const url = env().RAZORPAY_API_BASE.replace(/\/$/, "") + path;
  const headers = { Authorization: authHeader(), "Content-Type": "application/json" }; // may throw a config error
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    log.error("razorpay_unreachable", { path, err });
    throw new HttpError(502, "The payment service is not reachable right now. Please try again.", "payment_gateway_unavailable");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; description?: string } };
  if (!res.ok) {
    log.error("razorpay_error", { path, status: res.status, code: data.error?.code, description: data.error?.description });
    throw new HttpError(502, "The payment service returned an error. Please try again.", "payment_gateway_error");
  }
  return data;
}

export function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) {
    throw new HttpError(400, "Payable amount must be at least ₹1.", "amount_too_small");
  }
  return call<RazorpayOrder>("POST", "/v1/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt.slice(0, 40),
    notes: input.notes,
  });
}

export function fetchPayment(paymentId: string) {
  return call<RazorpayPayment>("GET", `/v1/payments/${encodeURIComponent(paymentId)}`);
}

export function capturePayment(paymentId: string, amountPaise: number) {
  return call<RazorpayPayment>("POST", `/v1/payments/${encodeURIComponent(paymentId)}/capture`, { amount: amountPaise, currency: "INR" });
}

/** Signature Razorpay Checkout returns to the browser: HMAC_SHA256(order_id|payment_id, key_secret). */
export function isValidCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = hmacSha256Hex(requireEnv("RAZORPAY_KEY_SECRET"), `${orderId}|${paymentId}`);
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw request body, webhook secret). */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = hmacSha256Hex(requireEnv("RAZORPAY_WEBHOOK_SECRET"), rawBody);
  return safeEqualHex(expected, signature);
}

export function razorpayKeyId(): string {
  return requireEnv("RAZORPAY_KEY_ID");
}
