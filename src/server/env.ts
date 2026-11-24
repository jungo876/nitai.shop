import "server-only";
import { z } from "zod";

/**
 * Server configuration, validated with zod.
 *
 * - Values are read lazily (on first use), so `next build` does not need secrets.
 * - Each feature asks only for what it needs via `requireEnv()`, so local
 *   development works without e.g. Razorpay keys.
 * - `productionConfigProblems()` lists everything a production deployment must
 *   have; it is checked at server start (see src/instrumentation.ts).
 *
 * Error messages name variables but never print their values.
 */

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Overrides the environment class; e.g. `test` for E2E runs of a production build. */
  APP_ENV: z.enum(["development", "test", "staging", "production"]).optional(),
  APP_URL: z.url().optional(),

  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "must be a postgres:// connection string")
    .optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).optional(),
  DATABASE_SSL: z.enum(["require", "disable", "verify-full"]).optional(),

  SUPABASE_URL: z.url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.url().optional(),
  /** New-style secret key (sb_secret_…) as named in the Supabase dashboard. */
  SUPABASE_SECRET_KEY: z.string().min(20).optional(),
  /** Legacy name / legacy service_role key — accepted as an alias. */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  STORAGE_BUCKET: z.string().min(1).default("product-images"),

  SESSION_SECRET: z.string().min(32, "must be at least 32 characters").optional(),

  RAZORPAY_KEY_ID: z.string().min(5).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(5).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(8).optional(),
  RAZORPAY_API_BASE: z.url().default("https://api.razorpay.com"),

  OTP_PROVIDER: z.enum(["console", "msg91", "twilio"]).default("console"),
  /** Development/test only: also append OTP codes to this file. */
  OTP_CONSOLE_OUTBOX: z.string().optional(),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional(),

  UPSTASH_REDIS_REST_URL: z.url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  CRON_SECRET: z.string().min(16, "must be at least 16 characters").optional(),
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

export type ServerEnv = z.infer<typeof schema> & {
  appEnv: "development" | "test" | "staging" | "production";
  isProduction: boolean;
  supabaseUrl: string | undefined;
  supabaseSecretKey: string | undefined;
};

let cached: ServerEnv | null = null;

/** Treat empty strings in .env files as "not set". */
function cleanedProcessEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) out[k] = v === "" ? undefined : v;
  return out;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(cleanedProcessEnv());
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new ConfigError(`Invalid server configuration:\n  - ${problems.join("\n  - ")}`);
  }
  const e = parsed.data;
  const appEnv = e.APP_ENV ?? (e.NODE_ENV === "production" ? "production" : e.NODE_ENV === "test" ? "test" : "development");
  cached = {
    ...e,
    appEnv,
    isProduction: appEnv === "production",
    supabaseUrl: e.SUPABASE_URL ?? e.NEXT_PUBLIC_SUPABASE_URL,
    supabaseSecretKey: e.SUPABASE_SECRET_KEY ?? e.SUPABASE_SERVICE_ROLE_KEY,
  };
  return cached;
}

/** For tests: forget the cached configuration after changing process.env. */
export function resetEnvCache() {
  cached = null;
}

type EnvKey = keyof z.infer<typeof schema>;

/** Returns a required variable or throws a ConfigError naming it (never its value). */
export function requireEnv<K extends EnvKey>(key: K): NonNullable<z.infer<typeof schema>[K]> {
  const value = env()[key];
  if (value === undefined || value === null || value === "") {
    throw new ConfigError(`Missing required environment variable ${String(key)}`);
  }
  return value as NonNullable<z.infer<typeof schema>[K]>;
}

const DEV_SESSION_SECRET = "dev-only-insecure-session-secret-do-not-use-in-production";

/** Secret used to HMAC one-time codes. A fixed fallback is allowed outside production only. */
export function sessionSecret(): string {
  const e = env();
  if (e.SESSION_SECRET) return e.SESSION_SECRET;
  if (e.isProduction) throw new ConfigError("Missing required environment variable SESSION_SECRET");
  return DEV_SESSION_SECRET;
}

/** Everything a production deployment needs. Empty array = ready. */
export function productionConfigProblems(): string[] {
  const e = env();
  const problems: string[] = [];
  const need = (key: EnvKey, why: string) => {
    if (!e[key]) problems.push(`${key} is required (${why})`);
  };
  need("DATABASE_URL", "database");
  need("APP_URL", "absolute links, origin checks");
  need("SESSION_SECRET", "login security");
  if (!e.supabaseSecretKey) problems.push("SUPABASE_SECRET_KEY is required (image uploads)");
  if (!e.supabaseUrl) problems.push("SUPABASE_URL is required (image uploads)");
  need("RAZORPAY_KEY_ID", "payments");
  need("RAZORPAY_KEY_SECRET", "payments");
  need("RAZORPAY_WEBHOOK_SECRET", "payment webhooks");
  need("CRON_SECRET", "scheduled jobs");
  if (e.OTP_PROVIDER === "console") problems.push("OTP_PROVIDER=console only logs codes; choose msg91 or twilio");
  if (e.OTP_PROVIDER === "msg91") {
    need("MSG91_AUTH_KEY", "OTP via MSG91");
    need("MSG91_TEMPLATE_ID", "OTP via MSG91");
  }
  if (e.OTP_PROVIDER === "twilio") {
    need("TWILIO_ACCOUNT_SID", "OTP via Twilio");
    need("TWILIO_AUTH_TOKEN", "OTP via Twilio");
    need("TWILIO_VERIFY_SERVICE_SID", "OTP via Twilio");
  }
  if (e.OTP_CONSOLE_OUTBOX) problems.push("OTP_CONSOLE_OUTBOX must not be set in production");
  if (e.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) problems.push("RAZORPAY_KEY_ID is a TEST key (rzp_test_…)");
  if (e.APP_URL && !e.APP_URL.startsWith("https://")) problems.push("APP_URL must use https://");
  if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) {
    problems.push("UPSTASH_REDIS_REST_URL/TOKEN not set — general API rate limiting will be per-instance only (warning)");
  }
  return problems;
}
