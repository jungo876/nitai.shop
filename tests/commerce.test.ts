import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startMigratedDb } from "./helpers/migrated-db";
import { body, makeReq } from "./helpers/http";
import { login, setupOtpOutbox } from "./helpers/auth";
import { startRazorpayMock, useRazorpayMockEnv } from "./helpers/razorpay-mock";
import { COMPLETE_PROFILE, seedCatalog } from "./helpers/seed";

let ctx: Awaited<ReturnType<typeof startMigratedDb>>;
let rzp: Awaited<ReturnType<typeof startRazorpayMock>>;
let outbox: ReturnType<typeof setupOtpOutbox>;
let cart: typeof import("@/app/api/cart/route");
let setup: typeof import("@/app/api/auth/setup/route");
let createOrder: typeof import("@/app/api/payment/create-order/route");
let verify: typeof import("@/app/api/payment/verify/route");
let webhook: typeof import("@/app/api/payment/webhook/route");
let orders: typeof import("@/app/api/orders/route");
let productById: typeof import("@/app/api/products/[id]/route");
let ordersLib: typeof import("@/server/orders");

beforeAll(async () => {
  outbox = setupOtpOutbox();
  rzp = await startRazorpayMock();
  useRazorpayMockEnv(rzp.baseUrl);
  ctx = await startMigratedDb();
  cart = await import("@/app/api/cart/route");
  setup = await import("@/app/api/auth/setup/route");
  createOrder = await import("@/app/api/payment/create-order/route");
  verify = await import("@/app/api/payment/verify/route");
  webhook = await import("@/app/api/payment/webhook/route");
  orders = await import("@/app/api/orders/route");
  productById = await import("@/app/api/products/[id]/route");
  ordersLib = await import("@/server/orders");
});
afterAll(async () => {
  await ctx?.cleanup();
  await rzp?.stop();
});

async function customer(withProfile = true) {
  const u = await login(outbox);
  if (withProfile) {
    const r = await setup.POST(makeReq("POST", "/api/auth/setup", { body: COMPLETE_PROFILE, cookie: u.cookie }), undefined);
    expect(r.status).toBe(200);
  }
  return u;
}
const add = (cookie: string, b: object) => cart.POST(makeReq("POST", "/api/cart", { body: b, cookie }), undefined);
const getCart = async (cookie: string) => body<{ items: Array<Record<string, unknown>>; subtotal: number; has_unavailable: boolean }>(await cart.GET(makeReq("GET", "/api/cart", { cookie }), undefined));
const checkout = (cookie: string, method = "prepaid") => createOrder.POST(makeReq("POST", "/api/payment/create-order", { body: { payment_method: method }, cookie }), undefined);
const confirm = (cookie: string, b: object) => verify.POST(makeReq("POST", "/api/payment/verify", { body: b, cookie }), undefined);

describe("cart pricing rules", () => {
  it("prices from the database, not the client", async () => {
    const c = await seedCatalog(ctx.sql);
    const u = await customer(false);
    // client tries to sneak in a price — ignored by the schema
    expect((await add(u.cookie, { product_id: c.productId, variant_id: c.variantA, bulk_price_id: c.tier5, box_count: 5, price_per_unit: 1 })).status).toBe(201);
    const data = await getCart(u.cookie);
    expect(data.items[0]).toMatchObject({ price_per_unit: 450, total_units: 50, total_price: 22500, available: true });
    expect(data.subtotal).toBe(22500);
  });

  it("rejects a bulk tier from another pack size", async () => {
    const c = await seedCatalog(ctx.sql);
    const u = await customer(false);
    const r = await add(u.cookie, { product_id: c.productId, variant_id: c.variantB, bulk_price_id: c.tier10, box_count: 10 });
    expect(r.status).toBe(400);
  });

  it("rejects a bulk price with fewer boxes than the tier requires", async () => {
    const c = await seedCatalog(ctx.sql);
    const u = await customer(false);
    const r = await add(u.cookie, { product_id: c.productId, variant_id: c.variantA, bulk_price_id: c.tier10, box_count: 1 });
    expect(r.status).toBe(400);
  });

  it("refuses unavailable products and unpriced pack sizes", async () => {
    const oos = await seedCatalog(ctx.sql, { status: "out_of_stock" });
    const free = await seedCatalog(ctx.sql, { unitPrice: 0 });
    const u = await customer(false);
    expect((await add(u.cookie, { product_id: oos.productId, variant_id: oos.variantB, box_count: 1 })).status).toBe(409);
    expect((await add(u.cookie, { product_id: free.productId, variant_id: free.variantA, box_count: 1 })).status).toBe(409);
  });

  it("customers cannot change someone else's cart", async () => {
    const c = await seedCatalog(ctx.sql);
    const a = await customer(false);
    const b = await customer(false);
    await add(a.cookie, { product_id: c.productId, variant_id: c.variantB, box_count: 1 });
    const itemId = (await getCart(a.cookie)).items[0].id as string;
    const r1 = await cart.PATCH(makeReq("PATCH", "/api/cart", { body: { item_id: itemId, quantity: 99 }, cookie: b.cookie }), undefined);
    const r2 = await cart.DELETE(makeReq("DELETE", "/api/cart", { body: { item_id: itemId }, cookie: b.cookie }), undefined);
    expect([r1.status, r2.status]).toEqual([404, 404]);
    expect((await getCart(a.cookie)).items[0].quantity).toBe(1);
  });

  it("editing a product keeps cart items valid; removing a pack size removes its cart items (never ₹0)", async () => {
    const c = await seedCatalog(ctx.sql);
    const u = await customer(false);
    await add(u.cookie, { product_id: c.productId, variant_id: c.variantA, bulk_price_id: c.tier5, box_count: 5 });
    await add(u.cookie, { product_id: c.productId, variant_id: c.variantB, box_count: 1 });

    const [admin] = await ctx.sql`insert into users (phone_number, is_admin) values ('9000000001', true) on conflict (phone_number) do update set is_admin = true returning id`;
    const adminLogin = await login(outbox, "9000000001");
    expect(admin.id).toBeTruthy();
    // Admin changes the 5-box price to 440 and deletes pack size B.
    const put = await productById.PUT(
      makeReq("PUT", `/api/products/${c.productId}`, {
        cookie: adminLogin.cookie,
        body: {
          name: "Knockdown 1L", category: "Insecticide", status: "active",
          variants: [{ id: c.variantA, label: "1 L", unit_price: 500, units_per_box: 10, bulk_prices: [{ id: c.tier5, box_count: 5, price_per_unit: 440 }, { id: c.tier10, box_count: 10, price_per_unit: 425 }] }],
        },
      }),
      { params: Promise.resolve({ id: c.productId }) }
    );
    expect(put.status).toBe(200);
    const data = await getCart(u.cookie);
    expect(data.items).toHaveLength(1); // pack B's line removed with it
    expect(data.items[0]).toMatchObject({ variant_id: c.variantA, price_per_unit: 440, total_price: 22000 });
    expect(data.items.every((i) => (i.total_price as number) > 0)).toBe(true);
  });
});

describe("checkout and payment verification", () => {
  async function readyToPay(method: "prepaid" | "cod" = "prepaid") {
    const c = await seedCatalog(ctx.sql);
    const u = await customer();
    await add(u.cookie, { product_id: c.productId, variant_id: c.variantA, bulk_price_id: c.tier5, box_count: 5 }); // ₹22,500
    const res = await checkout(u.cookie, method);
    expect(res.status).toBe(201);
    return { u, c, pay: await body<{ order_id: string; razorpay_order_id: string; amount_paise: number; total: number; pay_now: number; remaining: number }>(res) };
  }

  it("requires a complete profile", async () => {
    const c = await seedCatalog(ctx.sql);
    const u = await customer(false);
    await add(u.cookie, { product_id: c.productId, variant_id: c.variantB, box_count: 1 });
    const r = await checkout(u.cookie);
    expect(r.status).toBe(409);
    expect((await body(r)).code).toBe("profile_incomplete");
  });

  it("creates a pending order and a Razorpay order for the exact amount", async () => {
    const { pay } = await readyToPay();
    expect(pay).toMatchObject({ amount_paise: 2_250_000, total: 22500, pay_now: 22500, remaining: 0 });
    expect(rzp.orders.get(pay.razorpay_order_id)?.amount).toBe(2_250_000);
    const [o] = await ctx.sql`select order_status, payment_status from orders where id = ${pay.order_id}`;
    expect(o).toEqual({ order_status: "pending_payment", payment_status: "pending" });
  });

  it("rejects a forged signature (no free orders)", async () => {
    const { u, pay } = await readyToPay();
    const real = rzp.pay(pay.razorpay_order_id);
    const r = await confirm(u.cookie, { ...real, razorpay_signature: "a".repeat(64) });
    expect(r.status).toBe(400);
    const [o] = await ctx.sql`select payment_status from orders where id = ${pay.order_id}`;
    expect(o.payment_status).toBe("pending");
  });

  it("rejects a payment whose amount does not match the order", async () => {
    const { u, pay } = await readyToPay();
    const underpaid = rzp.pay(pay.razorpay_order_id, { amount: 100 });
    expect((await confirm(u.cookie, underpaid)).status).toBe(400);
  });

  it("confirms a real payment, clears the bought items and is idempotent", async () => {
    const { u, pay } = await readyToPay();
    const p = rzp.pay(pay.razorpay_order_id);
    const r = await confirm(u.cookie, p);
    expect(r.status).toBe(200);
    expect(await body(r)).toMatchObject({ success: true, already: false, order_number: expect.stringMatching(/^NCK-\d{6}$/) });
    const [o] = await ctx.sql`select order_status, payment_status, razorpay_payment_id, paid_at, admin_seen_at from orders where id = ${pay.order_id}`;
    expect(o).toMatchObject({ order_status: "placed", payment_status: "paid", razorpay_payment_id: p.razorpay_payment_id, admin_seen_at: null });
    expect(o.paid_at).toBeTruthy();
    expect((await getCart(u.cookie)).items).toHaveLength(0);
    expect(await body(await confirm(u.cookie, p))).toMatchObject({ already: true });
    const list = await body<{ orders: unknown[] }>(await orders.GET(makeReq("GET", "/api/orders", { cookie: u.cookie }), undefined));
    expect(list.orders).toHaveLength(1);
  });

  it("COD charges only the advance and records the balance", async () => {
    const { u, pay } = await readyToPay("cod");
    expect(pay).toMatchObject({ total: 22500, pay_now: 2250, remaining: 20250, amount_paise: 225000 });
    await confirm(u.cookie, rzp.pay(pay.razorpay_order_id));
    const [o] = await ctx.sql`select payment_status, advance_amount, remaining_amount, remaining_payment_method from orders where id = ${pay.order_id}`;
    expect(o).toEqual({ payment_status: "advance_paid", advance_amount: 2250, remaining_amount: 20250, remaining_payment_method: "cash_on_delivery" });
  });

  it("another customer cannot confirm my order", async () => {
    const { pay } = await readyToPay();
    const other = await customer();
    const r = await confirm(other.cookie, rzp.pay(pay.razorpay_order_id));
    expect(r.status).toBe(403);
  });

  it("captures an authorized-only payment before confirming", async () => {
    const { u, pay } = await readyToPay();
    const p = rzp.pay(pay.razorpay_order_id, { status: "authorized" });
    expect((await confirm(u.cookie, p)).status).toBe(200);
    expect(rzp.payments.get(p.razorpay_payment_id)?.status).toBe("captured");
  });

  it("webhook confirms the order when the customer closed the browser; bad signatures are rejected", async () => {
    const { pay } = await readyToPay();
    const p = rzp.pay(pay.razorpay_order_id);
    const { raw, signature } = rzp.webhookBody("payment.captured", p.razorpay_payment_id);
    const bad = await webhook.POST(makeReq("POST", "/api/payment/webhook", { origin: null, headers: { "content-type": "application/json", "x-razorpay-signature": "0".repeat(64) } }), undefined);
    expect(bad.status).toBe(400);
    const { NextRequest } = await import("next/server");
    const good = await webhook.POST(
      new NextRequest("http://localhost:3000/api/payment/webhook", { method: "POST", body: raw, headers: { "content-type": "application/json", "x-razorpay-signature": signature } }),
      undefined
    );
    expect(good.status).toBe(200);
    const [o] = await ctx.sql`select payment_status, order_status from orders where id = ${pay.order_id}`;
    expect(o).toEqual({ payment_status: "paid", order_status: "placed" });
  });

  it("expires unpaid checkouts, but a late valid payment still becomes an order", async () => {
    const { u, pay } = await readyToPay();
    await ctx.sql`update orders set payment_expires_at = now() - interval '1 minute' where id = ${pay.order_id}`;
    expect(await ordersLib.expirePendingOrders()).toBeGreaterThanOrEqual(1);
    const [cancelled] = await ctx.sql`select order_status, cancel_reason from orders where id = ${pay.order_id}`;
    expect(cancelled).toEqual({ order_status: "cancelled", cancel_reason: "payment_timeout" });
    expect((await confirm(u.cookie, rzp.pay(pay.razorpay_order_id))).status).toBe(200);
    const [revived] = await ctx.sql`select order_status, payment_status from orders where id = ${pay.order_id}`;
    expect(revived).toEqual({ order_status: "placed", payment_status: "paid" });
  });

  it("refuses checkout while the store is closed", async () => {
    const c = await seedCatalog(ctx.sql);
    const u = await customer();
    await add(u.cookie, { product_id: c.productId, variant_id: c.variantB, box_count: 1 });
    await ctx.sql`update store_settings set store_status = 'closed', closed_message = 'Closed for Durga Puja'`;
    try {
      const r = await checkout(u.cookie);
      expect(r.status).toBe(409);
      expect((await body(r)).error).toBe("Closed for Durga Puja");
    } finally {
      await ctx.sql`update store_settings set store_status = 'open', closed_message = null`;
    }
  });

  it("handles paise-precise prices (₹4.35 × 30 units)", async () => {
    const c = await seedCatalog(ctx.sql);
    await ctx.sql`update product_variants set unit_price = 4.35, units_per_box = 30 where id = ${c.variantB}`;
    const u = await customer();
    await add(u.cookie, { product_id: c.productId, variant_id: c.variantB, box_count: 1 });
    const res = await checkout(u.cookie);
    expect(await body(res)).toMatchObject({ amount_paise: 13050, total: 130.5 });
  });
});
