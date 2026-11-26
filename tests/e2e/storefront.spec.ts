import { test, expect, newApiContext } from "./fixtures";

test.describe("guest browsing", () => {
  test("home page shows the catalogue", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Confidor Imidacloprid 17.8% SL").first()).toBeVisible();
  });

  test("product page shows pack sizes and bulk prices", async ({ page }) => {
    await page.goto("/products");
    await page.getByText("Confidor Imidacloprid 17.8% SL").first().click();
    await expect(page).toHaveURL(/\/products\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { name: /Confidor/ })).toBeVisible();
    await expect(page.getByText("100 ml").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Buy Now/ })).toBeVisible();
  });

  test("out-of-stock product cannot be bought", async ({ page }) => {
    await page.goto("/products");
    await page.getByText("Saaf Fungicide").first().click();
    await expect(page.getByRole("button", { name: "Currently Unavailable" })).toBeDisabled();
  });

  test("brands page lists brands", async ({ page }) => {
    await page.goto("/companies");
    await expect(page.getByText("Bayer CropScience").first()).toBeVisible();
    await expect(page.getByText("Dhanuka Agritech").first()).toBeVisible();
  });

  test("adding to cart as a guest asks to log in", async ({ page }) => {
    await page.goto("/products");
    await page.getByText("Nativo Fungicide 75 WG").first().click();
    await page.getByRole("button", { name: /Add to Cart/ }).click();
    await expect(page.getByRole("dialog").getByText("Log in with your mobile")).toBeVisible();
  });

  test("admin area is closed to guests", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
    const api = await newApiContext();
    expect((await api.get("/api/admin/stats")).status()).toBe(401);
    expect((await api.get("/api/admin/orders")).status()).toBe(401);
    expect((await api.get("/api/admin/customers")).status()).toBe(401);
    await api.dispose();
  });

  test("cross-site form posts are rejected", async () => {
    const api = await newApiContext();
    const r = await api.post("/api/auth/otp/request", {
      data: { phone_number: "9876543210" },
      headers: { origin: "https://evil.example" },
    });
    expect(r.status()).toBe(403);
    await api.dispose();
  });

  test("unknown pages show a not-found page", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
  });
});
