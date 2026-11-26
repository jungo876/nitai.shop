import { test as base, expect, request as pwRequest, type APIRequestContext, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/** Must match scripts/e2e-server.mjs (not imported: that file starts the server). */
export const E2E = {
  baseURL: "http://localhost:3100",
  rzpURL: "http://127.0.0.1:3199",
  adminPhone: "9000000001",
  keyId: "rzp_test_e2emockkey",
  outbox: path.join(process.cwd(), ".data", "e2e", "otp-outbox.jsonl"),
};

let seq = 0;
/** A fresh, valid Indian mobile number per call (never the admin's). */
export function newPhone() {
  seq++;
  const n = (Date.now() % 10_000_000).toString().padStart(7, "0");
  return `97${n}${seq % 10}`.slice(0, 10);
}
/** A fresh client IP so rate limits for one test never affect another. */
export function newIp() {
  return `10.${(seq * 7) % 250}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
}

/** Waits for the newest code the console OTP provider wrote for this phone. */
export async function otpFor(phone: string, after = 0): Promise<string> {
  for (let i = 0; i < 50; i++) {
    if (existsSync(E2E.outbox)) {
      const mine = readFileSync(E2E.outbox, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as { phone: string; code: string; at: string })
        .filter((l) => l.phone === phone && Date.parse(l.at) >= after);
      if (mine.length) return mine[mine.length - 1].code;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`No OTP was sent to ${phone}`);
}

export const PROFILE = {
  name: "Ramesh Kumar",
  shop: "Krishna Agro Store",
  address: "12 Station Road, Ward 4",
  city: "Howrah",
  state: "West Bengal",
  pincode: "711101",
};

/** Logs in through the real login sheet (must already be open). */
export async function loginInSheet(page: Page, phone: string) {
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  const since = Date.now() - 1000;
  await sheet.getByLabel("Mobile number").fill(phone);
  await sheet.getByRole("button", { name: "Send code" }).click();
  const code = await otpFor(phone, since);
  await sheet.getByLabel("6-digit code").fill(code); // auto-submits at 6 digits
  await expect(sheet).toBeHidden();
}

/** Fills the 3-step profile form. */
export async function completeProfileForm(page: Page, p = PROFILE) {
  await expect(page).toHaveURL(/\/account\/setup/);
  await page.locator("#setup-name").fill(p.name);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("#setup-shop").fill(p.shop);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.locator("#setup-addr").fill(p.address);
  await page.locator("#setup-city").fill(p.city);
  await page.locator("#setup-pin").fill(p.pincode);
  await page.locator("#setup-state").selectOption(p.state);
  await page.getByRole("button", { name: /Complete Setup/ }).click();
  await expect(page).not.toHaveURL(/\/account\/setup/);
}

// ─── API-level helpers (fast setup for admin tests) ───────────────────────

export interface ApiProduct {
  id: string;
  name: string;
  status: string;
  product_variants: { id: string; label: string; unit_price: number; units_per_box: number; bulk_prices: { id: string; box_count: number; price_per_unit: number }[] }[];
}

/** Logs a phone in through the API. Cookies stay in the returned context. */
export async function apiLogin(ctx: APIRequestContext, phone: string) {
  const since = Date.now() - 1000;
  const r1 = await ctx.post("/api/auth/otp/request", { data: { phone_number: phone } });
  expect(r1.status(), await r1.text()).toBe(200);
  const code = await otpFor(phone, since);
  const r2 = await ctx.post("/api/auth/otp/verify", { data: { phone_number: phone, code } });
  expect(r2.ok(), await r2.text()).toBeTruthy();
  return (await r2.json()).user as { id: string; is_admin: boolean; is_profile_complete: boolean };
}

export async function apiCompleteProfile(ctx: APIRequestContext, p = PROFILE) {
  const r = await ctx.post("/api/auth/setup", {
    data: { name: p.name, shop_name: p.shop, address_line: p.address, city: p.city, state: p.state, pincode: p.pincode },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
}

export async function apiProducts(ctx: APIRequestContext): Promise<ApiProduct[]> {
  const r = await ctx.get("/api/products");
  expect(r.ok()).toBeTruthy();
  return r.json();
}

/** Simulates the customer completing Razorpay Checkout for this order. */
export async function payAtRazorpay(order_id: string) {
  const rzp = await pwRequest.newContext({ baseURL: E2E.rzpURL });
  const r = await rzp.post("/__test/pay", { data: { order_id } });
  expect(r.ok()).toBeTruthy();
  const body = await r.json();
  await rzp.dispose();
  return body as { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; amount: number };
}

/** Customer with a complete profile who places and pays for one order via the API. */
export async function apiPlaceOrder(ctx: APIRequestContext, method: "prepaid" | "cod" = "prepaid") {
  const products = await apiProducts(ctx);
  const p = products.find((x) => x.status === "active" && x.product_variants.length)!;
  const v = p.product_variants[0];
  const add = await ctx.post("/api/cart", { data: { product_id: p.id, variant_id: v.id, box_count: 1 } });
  expect(add.ok(), await add.text()).toBeTruthy();
  const created = await ctx.post("/api/payment/create-order", { data: { payment_method: method } });
  expect(created.status(), await created.text()).toBe(201);
  const order = (await created.json()) as { order_id: string; order_number: string; razorpay_order_id: string; amount_paise: number };
  const paid = await payAtRazorpay(order.razorpay_order_id);
  const verify = await ctx.post("/api/payment/verify", {
    data: { razorpay_order_id: paid.razorpay_order_id, razorpay_payment_id: paid.razorpay_payment_id, razorpay_signature: paid.razorpay_signature },
  });
  expect(verify.ok(), await verify.text()).toBeTruthy();
  return { ...order, product: p, variant: v };
}

export async function newApiContext(ip = newIp()) {
  return pwRequest.newContext({ baseURL: E2E.baseURL, extraHTTPHeaders: { "x-forwarded-for": ip } });
}

// ─── Fake Razorpay Checkout in the browser ────────────────────────────────

type RzpMode = "pay" | "fail" | "dismiss";
export interface FakeRazorpay {
  /** What the next "payment" does. */
  mode(m: RzpMode): Promise<void>;
  /** Options the page passed to `new Razorpay(...)` last time. */
  lastOptions(): { key: string; amount: number; order_id: string } | null;
}

const FAKE_CHECKOUT_JS = `
(function () {
  function Razorpay(opts) { this.opts = opts; this.handlers = {}; }
  Razorpay.prototype.on = function (ev, fn) { this.handlers[ev] = fn; };
  Razorpay.prototype.open = function () {
    var self = this, mode = window.__e2eRzpMode || "pay";
    window.__e2eRzpOpened({ key: self.opts.key, amount: self.opts.amount, order_id: self.opts.order_id });
    setTimeout(function () {
      if (mode === "dismiss") { self.opts.modal && self.opts.modal.ondismiss && self.opts.modal.ondismiss(); return; }
      if (mode === "fail") { self.handlers["payment.failed"] && self.handlers["payment.failed"]({ error: { description: "Card declined (test)" } }); return; }
      window.__e2eRzpPay(self.opts.order_id).then(function (resp) { self.opts.handler(resp); });
    }, 50);
  };
  window.Razorpay = Razorpay;
})();`;

export const test = base.extend<{ rzp: FakeRazorpay }>({
  // Every test gets its own client IP so per-IP rate limits never collide.
  extraHTTPHeaders: async ({}, provide) => {
    await provide({ "x-forwarded-for": newIp() });
  },
  rzp: async ({ page }, provide) => {
    let last: { key: string; amount: number; order_id: string } | null = null;
    await page.route("https://checkout.razorpay.com/v1/checkout.js", (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: FAKE_CHECKOUT_JS })
    );
    await page.exposeFunction("__e2eRzpOpened", (o: typeof last) => {
      last = o;
    });
    await page.exposeFunction("__e2eRzpPay", async (orderId: string) => {
      const r = await payAtRazorpay(orderId);
      return { razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature };
    });
    await provide({
      mode: async (m) => {
        await page.evaluate((mm) => ((window as unknown as { __e2eRzpMode: string }).__e2eRzpMode = mm), m);
      },
      lastOptions: () => last,
    });
  },
});

export { expect };
