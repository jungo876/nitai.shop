import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startMigratedDb } from "./helpers/migrated-db";
import { body, makeReq } from "./helpers/http";
import { login, setupOtpOutbox, testPhone } from "./helpers/auth";
import { startRazorpayMock, useRazorpayMockEnv } from "./helpers/razorpay-mock";
import { COMPLETE_PROFILE, seedCatalog } from "./helpers/seed";

let ctx: Awaited<ReturnType<typeof startMigratedDb>>;
let rzp: Awaited<ReturnType<typeof startRazorpayMock>>;
let outbox: ReturnType<typeof setupOtpOutbox>;
let admin: { cookie: string; user: { id: string } };
let customer: { cookie: string; user: { id: string } };

const ctxFor = (id: string) => ({ params: Promise.resolve({ id }) });

beforeAll(async () => {
  outbox = setupOtpOutbox();
  rzp = await startRazorpayMock();
  useRazorpayMockEnv(rzp.baseUrl);
  ctx = await startMigratedDb();
  const adminPhone = testPhone();
  await ctx.sql`insert into users (phone_number, is_admin) values (${adminPhone}, true)`;
  admin = await login(outbox, adminPhone);
  customer = await login(outbox);
});
afterAll(async () => {
  await ctx?.cleanup();
  await rzp?.stop();
});

describe("admin authorization", () => {
  it("every admin endpoint refuses visitors (401) and customers (403)", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    const endpoints: Array<[string, string, () => Promise<{ [m: string]: (...a: never[]) => Promise<Response> }>, object?]> = [
      ["GET", "/api/admin/orders", () => import("@/app/api/admin/orders/route")],
      ["PATCH", "/api/admin/orders", () => import("@/app/api/admin/orders/route"), { order_id: id, order_status: "shipped" }],
      ["GET", "/api/admin/export", () => import("@/app/api/admin/export/route")],
      ["GET", "/api/admin/stats", () => import("@/app/api/admin/stats/route")],
      ["GET", "/api/admin/analytics", () => import("@/app/api/admin/analytics/route")],
      ["GET", "/api/admin/customers", () => import("@/app/api/admin/customers/route")],
      ["GET", "/api/admin/settings", () => import("@/app/api/admin/settings/route")],
      ["GET", "/api/admin/activity", () => import("@/app/api/admin/activity/route")],
      ["POST", "/api/products", () => import("@/app/api/products/route"), { name: "X", category: "Insecticide" }],
      ["POST", "/api/companies", () => import("@/app/api/companies/route"), { name: "X" }],
      ["POST", "/api/banners", () => import("@/app/api/banners/route"), { image_url: "https://x.test/a.png" }],
      ["POST", "/api/dev/reset", () => import("@/app/api/dev/reset/route"), { action: "clear_orders" }],
    ];
    for (const [method, path, load, payload] of endpoints) {
      const mod = await load();
      const handler = mod[method] as unknown as (r: Request, c: unknown) => Promise<Response>;
      const anon = await handler(makeReq(method, path, { body: payload }), ctxFor(id));
      const cust = await handler(makeReq(method, path, { body: payload, cookie: customer.cookie }), ctxFor(id));
      expect([path, anon.status]).toEqual([path, 401]);
      expect([path, cust.status]).toEqual([path, 403]);
    }
  });

  it("hidden products are only listed for admins", async () => {
    await seedCatalog(ctx.sql, { status: "hidden" });
    const products = await import("@/app/api/products/route");
    const asCustomer = await body<unknown[]>(await products.GET(makeReq("GET", "/api/products?include_hidden=true", { cookie: customer.cookie }), undefined));
    const asAdmin = await body<Array<{ status: string }>>(await products.GET(makeReq("GET", "/api/products?include_hidden=true", { cookie: admin.cookie }), undefined));
    expect(asCustomer.every((p) => (p as { status: string }).status !== "hidden")).toBe(true);
    expect(asAdmin.some((p) => p.status === "hidden")).toBe(true);
  });
});

describe("admin order management", () => {
  let orderId: string;

  beforeAll(async () => {
    const c = await seedCatalog(ctx.sql);
    const setup = await import("@/app/api/auth/setup/route");
    const cart = await import("@/app/api/cart/route");
    const create = await import("@/app/api/payment/create-order/route");
    const verify = await import("@/app/api/payment/verify/route");
    await setup.POST(makeReq("POST", "/api/auth/setup", { body: { ...COMPLETE_PROFILE, name: "=HYPERLINK(\"http://evil\")" }, cookie: customer.cookie }), undefined);
    await cart.POST(makeReq("POST", "/api/cart", { body: { product_id: c.productId, variant_id: c.variantB, box_count: 1 }, cookie: customer.cookie }), undefined);
    const p = await body<{ order_id: string; razorpay_order_id: string }>(await create.POST(makeReq("POST", "/api/payment/create-order", { body: { payment_method: "cod" }, cookie: customer.cookie }), undefined));
    await verify.POST(makeReq("POST", "/api/payment/verify", { body: rzp.pay(p.razorpay_order_id), cookie: customer.cookie }), undefined);
    orderId = p.order_id;
  });

  it("lists new paid orders with a 'new' badge and clears it", async () => {
    const route = await import("@/app/api/admin/orders/route");
    const list = await body<{ orders: Array<{ id: string; is_new: boolean }>; counts: { unseen: number } }>(await route.GET(makeReq("GET", "/api/admin/orders", { cookie: admin.cookie }), undefined));
    expect(list.orders.find((o) => o.id === orderId)?.is_new).toBe(true);
    expect(list.counts.unseen).toBeGreaterThanOrEqual(1);
    await route.POST(makeReq("POST", "/api/admin/orders", { body: { ids: [orderId] }, cookie: admin.cookie }), undefined);
    const after = await body<{ orders: Array<{ id: string; is_new: boolean }> }>(await route.GET(makeReq("GET", "/api/admin/orders", { cookie: admin.cookie }), undefined));
    expect(after.orders.find((o) => o.id === orderId)?.is_new).toBe(false);
  });

  it("marks a COD order fully paid after delivery (the old 'Paid' button bug)", async () => {
    const route = await import("@/app/api/admin/orders/route");
    const res = await route.PATCH(makeReq("PATCH", "/api/admin/orders", { body: { order_id: orderId, order_status: "delivered", payment_status: "paid", remaining_payment_method: "upi" }, cookie: admin.cookie }), undefined);
    expect(res.status).toBe(200);
    const [o] = await ctx.sql`select order_status, payment_status, remaining_payment_method from orders where id = ${orderId}`;
    expect(o).toEqual({ order_status: "delivered", payment_status: "paid", remaining_payment_method: "upi" });
    // the old UI value is rejected loudly instead of silently ignored
    const bad = await route.PATCH(makeReq("PATCH", "/api/admin/orders", { body: { order_id: orderId, payment_status: "fully_paid" }, cookie: admin.cookie }), undefined);
    expect(bad.status).toBe(400);
    const log = await ctx.sql`select action from admin_activity_logs where entity_id = ${orderId}`;
    expect(log.length).toBeGreaterThanOrEqual(1);
  });

  it("CSV export neutralises spreadsheet formulas", async () => {
    const route = await import("@/app/api/admin/export/route");
    const res = await route.GET(makeReq("GET", "/api/admin/export", { cookie: admin.cookie }), undefined);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const csv = await res.text();
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });

  it("dashboard and analytics use real numbers", async () => {
    const stats = await body<{ kpis: { orders: number; order_value: number } }>(await (await import("@/app/api/admin/stats/route")).GET(makeReq("GET", "/api/admin/stats", { cookie: admin.cookie }), undefined));
    expect(stats.kpis.orders).toBeGreaterThanOrEqual(1);
    expect(stats.kpis.order_value).toBeGreaterThan(0);
    const a = await (await import("@/app/api/admin/analytics/route")).GET(makeReq("GET", "/api/admin/analytics?range=30", { cookie: admin.cookie }), undefined);
    expect(a.status).toBe(200);
    expect((await body<{ daily: unknown[] }>(a)).daily.length).toBeGreaterThanOrEqual(1);
  });

  it("settings changes apply to checkout (e.g. COD advance %)", async () => {
    const route = await import("@/app/api/admin/settings/route");
    const res = await route.PUT(makeReq("PUT", "/api/admin/settings", {
      cookie: admin.cookie,
      body: { store_name: "NCK Agro", store_status: "open", cod_enabled: true, cod_advance_percent: 20, min_order_amount: 0, whatsapp_number: "+91 98765 43210" },
    }), undefined);
    expect(res.status).toBe(200);
    expect(await body(res)).toMatchObject({ cod_advance_percent: 20, whatsapp_number: "9876543210" });
    const publicSettings = await body(await (await import("@/app/api/settings/route")).GET(makeReq("GET", "/api/settings"), undefined));
    expect(publicSettings).toMatchObject({ cod_advance_percent: 20 });
    await ctx.sql`update store_settings set cod_advance_percent = 10`;
  });

  it("an admin can grant admin access, which logs the user out everywhere", async () => {
    const someone = await login(outbox);
    const route = await import("@/app/api/admin/customers/[id]/route");
    const res = await route.PATCH(makeReq("PATCH", `/api/admin/customers/${someone.user.id}`, { body: { is_admin: true }, cookie: admin.cookie }), ctxFor(someone.user.id));
    expect(res.status).toBe(200);
    const me = await import("@/app/api/auth/me/route");
    expect(await body(await me.GET(makeReq("GET", "/api/auth/me", { cookie: someone.cookie }), undefined))).toEqual({ user: null });
    const self = await route.PATCH(makeReq("PATCH", `/api/admin/customers/${admin.user.id}`, { body: { is_admin: false }, cookie: admin.cookie }), ctxFor(admin.user.id));
    expect(self.status).toBe(400);
  });
});

describe("uploads", () => {
  it("rejects files that are not really images, whatever their name/type says", async () => {
    const route = await import("@/app/api/upload/route");
    const form = new FormData();
    form.append("file", new File([new TextEncoder().encode("<script>alert(1)</script>")], "logo.png", { type: "image/png" }));
    const { NextRequest } = await import("next/server");
    const res = await route.POST(new NextRequest("http://localhost:3000/api/upload", { method: "POST", body: form, headers: { origin: "http://localhost:3000", cookie: admin.cookie } }), undefined);
    expect(res.status).toBe(400);
    expect((await body(res)).error).toMatch(/JPEG, PNG, WebP or GIF/);
  });
});
