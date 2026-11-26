import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { productionConfigProblems, resetEnvCache } from "@/server/env";

/** Production safety checks. Each test sets its own environment. */
const saved = { ...process.env };
function setEnv(vars: Record<string, string | undefined>) {
  for (const k of Object.keys(process.env)) {
    if (/^(APP_|DATABASE_|SESSION_|SUPABASE_|NEXT_PUBLIC_SUPABASE|RAZORPAY_|CRON_|OTP_|MSG91_|TWILIO_|UPSTASH_)/.test(k)) delete process.env[k];
  }
  Object.assign(process.env, vars);
  resetEnvCache();
}
beforeEach(() => resetEnvCache());
afterEach(() => {
  process.env = { ...saved };
  resetEnvCache();
});

const COMPLETE = {
  APP_ENV: "production",
  APP_URL: "https://www.nitai.shop",
  DATABASE_URL: "postgres://u:p@db.example.com:6543/postgres",
  SESSION_SECRET: "x".repeat(48),
  SUPABASE_URL: "https://abc.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_example_value_0000",
  RAZORPAY_KEY_ID: "rzp_live_example",
  RAZORPAY_KEY_SECRET: "secret_value",
  RAZORPAY_WEBHOOK_SECRET: "webhook_secret",
  CRON_SECRET: "c".repeat(32),
  OTP_PROVIDER: "msg91",
  MSG91_AUTH_KEY: "k",
  MSG91_TEMPLATE_ID: "t",
};

describe("production configuration check", () => {
  it("passes a complete live configuration (rate-limit store only a warning)", () => {
    setEnv(COMPLETE);
    const r = productionConfigProblems();
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(" ")).toMatch(/UPSTASH/);
  });

  it("refuses test payment keys, console OTP, http URL and missing secrets", () => {
    setEnv({ ...COMPLETE, RAZORPAY_KEY_ID: "rzp_test_abc", OTP_PROVIDER: "console", APP_URL: "http://nitai.shop", CRON_SECRET: undefined });
    const text = productionConfigProblems().errors.join("\n");
    expect(text).toMatch(/TEST key/);
    expect(text).toMatch(/OTP_PROVIDER=console/);
    expect(text).toMatch(/https/);
    expect(text).toMatch(/CRON_SECRET/);
  });

  it("never includes secret values in messages", () => {
    setEnv({ ...COMPLETE, RAZORPAY_KEY_ID: "rzp_test_SECRETVALUE", OTP_PROVIDER: "twilio" });
    const all = JSON.stringify(productionConfigProblems());
    expect(all).not.toContain("SECRETVALUE");
    expect(all).not.toContain(COMPLETE.SESSION_SECRET);
  });
});

describe("runtime guards in production", () => {
  it("the console OTP provider refuses to 'send' codes", async () => {
    setEnv({ ...COMPLETE, OTP_PROVIDER: "console" });
    const { getOtpProvider, OtpProviderError } = await import("@/server/auth/otp-providers");
    const p = getOtpProvider();
    expect(p.kind).toBe("local");
    if (p.kind !== "local") return;
    await expect(p.deliver("9876543210", "123456")).rejects.toBeInstanceOf(OtpProviderError);
  });

  it("a Razorpay test key cannot create orders", async () => {
    setEnv({ ...COMPLETE, RAZORPAY_KEY_ID: "rzp_test_abc", RAZORPAY_API_BASE: "http://127.0.0.1:9" });
    const { createRazorpayOrder } = await import("@/server/payments/razorpay");
    await expect(createRazorpayOrder({ amountPaise: 10000, receipt: "r1", notes: {} })).rejects.toMatchObject({ status: 503 });
  });
});
