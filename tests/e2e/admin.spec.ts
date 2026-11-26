import type { APIRequestContext, Browser } from "@playwright/test";
import { test, expect, E2E, newPhone, newApiContext, apiLogin, apiCompleteProfile, apiPlaceOrder } from "./fixtures";

/** The admin logs in once (OTP resend cooldown is 30 s per phone); browser tests reuse the cookies. */
let admin: APIRequestContext;
let adminState: Awaited<ReturnType<APIRequestContext["storageState"]>>;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  admin = await newApiContext();
  const u = await apiLogin(admin, E2E.adminPhone);
  expect(u.is_admin).toBe(true);
  await apiCompleteProfile(admin, { name: "Store Admin", shop: "NCK Agro", address: "Main Road, Howrah", city: "Howrah", state: "West Bengal", pincode: "711101" });
  adminState = await admin.storageState();
});
test.afterAll(async () => {
  await admin?.dispose();
});

async function adminPage(browser: Browser) {
  const ctx = await browser.newContext({ storageState: adminState, baseURL: E2E.baseURL, extraHTTPHeaders: { "x-forwarded-for": "10.200.0.1" } });
  return { ctx, page: await ctx.newPage() };
}

async function newCustomer() {
  const c = await newApiContext();
  const user = await apiLogin(c, newPhone());
  await apiCompleteProfile(c);
  return { c, user };
}

test("admin sees a new order and moves it through to delivered", async ({ browser }) => {
  const { c } = await newCustomer();
  const order = await apiPlaceOrder(c, "prepaid");

  const { ctx, page } = await adminPage(browser);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Access Denied" })).toHaveCount(0);

  await page.goto("/admin/orders");
  const row = page.locator("li").filter({ hasText: order.order_number });
  await expect(row).toBeVisible();
  await expect(row.getByText("NEW")).toBeVisible();
  await row.getByRole("button", { name: "Mark shipped" }).click();
  await expect(row.getByText("Shipped").first()).toBeVisible();
  await row.getByRole("button", { name: "Mark delivered" }).click();
  await expect(row.getByText("Delivered").first()).toBeVisible();

  // The customer sees the new status
  const mine = await (await c.get(`/api/orders/${order.order_id}`)).json();
  expect(mine.order.order_status).toBe("delivered");
  await ctx.close();
  await c.dispose();
});

test("admin records the balance of a COD order", async ({ browser }) => {
  const { c } = await newCustomer();
  const order = await apiPlaceOrder(c, "cod");
  const before = await (await c.get(`/api/orders/${order.order_id}`)).json();
  expect(before.order.payment_status).toBe("advance_paid");
  expect(before.order.remaining_amount).toBeGreaterThan(0);

  const { ctx, page } = await adminPage(browser);
  await page.goto("/admin/orders");
  const row = page.locator("li").filter({ hasText: order.order_number });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Balance received" }).click();
  await expect.poll(async () => (await (await c.get(`/api/orders/${order.order_id}`)).json()).order.payment_status).toBe("paid");
  await ctx.close();
  await c.dispose();
});

test("customers cannot use admin features", async ({ browser }) => {
  const { c, user } = await newCustomer();
  expect((await c.get("/api/admin/stats")).status()).toBe(403);
  expect((await c.get("/api/admin/orders")).status()).toBe(403);
  expect((await c.patch(`/api/admin/customers/${user.id}`, { data: { is_admin: true } })).status()).toBe(403);
  expect((await c.post("/api/products", { data: { name: "Hack" } })).status()).toBe(403);

  const ctx = await browser.newContext({ storageState: await c.storageState(), baseURL: E2E.baseURL });
  const page = await ctx.newPage();
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
  await ctx.close();
  await c.dispose();
});

test("closing the store blocks new orders with the owner's message", async ({ browser }) => {
  const settings = await (await admin.get("/api/admin/settings")).json();
  const closedMsg = "Closed for Diwali, back on Monday.";
  const put = await admin.put("/api/admin/settings", { data: { ...settings, store_status: "closed", closed_message: closedMsg } });
  expect(put.ok(), await put.text()).toBeTruthy();

  try {
    const { c } = await newCustomer();
    const products = await (await c.get("/api/products")).json();
    const p = products.find((x: { status: string }) => x.status === "active");
    await c.post("/api/cart", { data: { product_id: p.id, variant_id: p.product_variants[0].id, box_count: 1 } });
    const created = await c.post("/api/payment/create-order", { data: { payment_method: "prepaid" } });
    expect(created.status()).toBeGreaterThanOrEqual(400);

    const ctx = await browser.newContext({ storageState: await c.storageState(), baseURL: E2E.baseURL });
    const page = await ctx.newPage();
    await page.route("https://checkout.razorpay.com/v1/checkout.js", (r) => r.fulfill({ contentType: "application/javascript", body: "window.Razorpay=function(){};" }));
    await page.goto("/checkout");
    await expect(page.getByText(closedMsg).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Securely/ })).toBeDisabled();
    await ctx.close();
    await c.dispose();
  } finally {
    await admin.put("/api/admin/settings", { data: { ...settings, store_status: "open" } });
  }
});

test("admin can export orders as CSV", async () => {
  const r = await admin.get("/api/admin/export");
  expect(r.ok()).toBeTruthy();
  expect(r.headers()["content-type"]).toContain("text/csv");
  expect((await r.text()).split("\n")[0]).toMatch(/order/i);
});
