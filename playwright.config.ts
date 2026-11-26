import { defineConfig, devices } from "@playwright/test";

/**
 * Browser end-to-end tests. They run against the PRODUCTION build served by
 * scripts/e2e-server.mjs, which uses an in-memory database and a fake
 * Razorpay — nothing real is touched. Run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // one shared database; tests change store settings
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // Desktop layout smoke test (the full flows run on mobile, where most customers are).
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /storefront.spec.ts/ },
  ],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://localhost:3100/api/settings",
    timeout: 120_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
  },
});
