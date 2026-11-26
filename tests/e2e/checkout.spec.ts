import type { Page } from "@playwright/test";
import { test, expect, newPhone, loginInSheet, completeProfileForm, apiLogin, apiCompleteProfile, E2E } from "./fixtures";

async function openProduct(page: Page, name: string) {
  await page.goto("/products");
  await page.getByText(name).first().click();
  await expect(page).toHaveURL(/\/products\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(name.split(" ")[0]) })).toBeVisible();
}

/** What the server says the customer must pay now (in paise), read before paying. */
async function expectedPayNowPaise(page: Page, method: "prepaid" | "cod") {
  const s = await (await page.request.get("/api/checkout/summary")).json();
  const total = Math.round(s.subtotal * 100);
  return method === "prepaid" ? total : Math.round((total * s.settings.cod_advance_percent) / 100);
}

test("new customer: login, profile, cart, prepaid payment", async ({ page, rzp }) => {
  const phone = newPhone();
  await openProduct(page, "Confidor Imidacloprid 17.8% SL");
  const productUrl = page.url();

  // Guest tries to add -> login sheet -> new account -> profile form -> back to the product
  await page.getByRole("button", { name: /Add to Cart/ }).click();
  await loginInSheet(page, phone);
  await completeProfileForm(page);
  await expect(page).toHaveURL(productUrl);

  await page.getByRole("button", { name: /Add to Cart/ }).click();
  await expect(page.getByRole("button", { name: /Added!/ })).toBeVisible();

  await page.goto("/cart");
  await expect(page.getByText("Confidor Imidacloprid 17.8% SL").first()).toBeVisible();
  await page.getByRole("button", { name: /Proceed to Checkout/ }).click();

  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByText("12 Station Road, Ward 4")).toBeVisible();
  const payButton = page.getByRole("button", { name: /Securely/ });
  await expect(payButton).toBeEnabled();
  const expected = await expectedPayNowPaise(page, "prepaid");

  await payButton.click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}\?placed=1/);
  await expect(page.getByText("Thank you! Your order is placed.")).toBeVisible();
  await expect(page.getByText("Fully paid").first()).toBeVisible();
  expect(rzp.lastOptions()?.amount).toBe(expected);
  expect(rzp.lastOptions()?.key).toBe(E2E.keyId);

  // Cart is empty afterwards, and the order is in My Orders
  const cart = await (await page.request.get("/api/cart")).json();
  expect(cart.items).toHaveLength(0);
  await page.goto("/orders");
  await expect(page.getByText(/Confidor|NCK-|#/).first()).toBeVisible();
});

test("cash on delivery: pays only the advance", async ({ page, rzp }) => {
  await page.goto("/");
  await apiLogin(page.request, newPhone());
  await apiCompleteProfile(page.request);

  await openProduct(page, "Targa Super Herbicide");
  await page.getByRole("button", { name: /Buy Now/ }).click();
  await expect(page).toHaveURL(/\/checkout/);

  await page.getByRole("button", { name: /Cash on Delivery/ }).click();
  await expect(page.getByText(/advance\)/).first()).toBeVisible();
  const expected = await expectedPayNowPaise(page, "cod");
  await page.getByRole("button", { name: /Securely/ }).click();

  await expect(page.getByText("Thank you! Your order is placed.")).toBeVisible();
  await expect(page.getByText("Advance paid").first()).toBeVisible();
  expect(rzp.lastOptions()?.amount).toBe(expected);
});

test("failed or cancelled payment keeps the cart and allows retry", async ({ page, rzp }) => {
  await page.goto("/");
  await apiLogin(page.request, newPhone());
  await apiCompleteProfile(page.request);

  await openProduct(page, "Nativo Fungicide 75 WG");
  await page.getByRole("button", { name: /Buy Now/ }).click();
  await expect(page).toHaveURL(/\/checkout/);
  const payButton = page.getByRole("button", { name: /Securely/ });
  await expect(payButton).toBeEnabled();

  await rzp.mode("fail");
  await payButton.click();
  await expect(page.getByRole("alert").filter({ hasText: "Payment failed" })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout/);

  await rzp.mode("dismiss");
  await payButton.click();
  await expect(payButton).toBeEnabled();

  const cart = await (await page.request.get("/api/cart")).json();
  expect(cart.items.length).toBeGreaterThan(0);

  await rzp.mode("pay");
  await payButton.click();
  await expect(page.getByText("Thank you! Your order is placed.")).toBeVisible();
});

test("tampered payment signature is rejected", async ({ page }) => {
  await page.goto("/");
  await apiLogin(page.request, newPhone());
  await apiCompleteProfile(page.request);
  const products = await (await page.request.get("/api/products")).json();
  const p = products.find((x: { name: string }) => x.name.startsWith("Zinc"));
  await page.request.post("/api/cart", { data: { product_id: p.id, variant_id: p.product_variants[0].id, box_count: 1 } });
  const created = await (await page.request.post("/api/payment/create-order", { data: { payment_method: "prepaid" } })).json();
  const r = await page.request.post("/api/payment/verify", {
    data: { razorpay_order_id: created.razorpay_order_id, razorpay_payment_id: "pay_fake123", razorpay_signature: "0".repeat(64) },
  });
  expect(r.status()).toBe(400);
  const order = await (await page.request.get(`/api/orders/${created.order_id}`)).json();
  expect(order.order.payment_status).toBe("pending");
});
