#!/usr/bin/env node
/**
 * Environment checker — reports which variables are set WITHOUT printing values.
 *
 * Usage:
 *   npm run check-env              # checks .env.local / .env (development rules)
 *   npm run check-env -- --prod    # applies production rules (stricter)
 *
 * Exit code 1 if a required variable is missing.
 */
import nextEnv from "@next/env";

const prod = process.argv.includes("--prod");
nextEnv.loadEnvConfig(process.cwd(), !prod);

/** @type {{name: string, required: "always" | "prod" | "optional", purpose: string, aliases?: string[]}[]} */
const VARS = [
  { name: "DATABASE_URL", required: "always", purpose: "Postgres connection string (Supabase pooler URI)" },
  { name: "SUPABASE_URL", required: "always", purpose: "Supabase project URL (storage)", aliases: ["NEXT_PUBLIC_SUPABASE_URL"] },
  { name: "SUPABASE_SECRET_KEY", required: "always", purpose: "Server-only secret key (sb_secret_…) for Storage uploads", aliases: ["SUPABASE_SERVICE_ROLE_KEY"] },
  { name: "SESSION_SECRET", required: "prod", purpose: "Secret for hashing session tokens / OTP codes (32+ chars)" },
  { name: "APP_URL", required: "prod", purpose: "Public site URL, e.g. https://nck.example.com" },
  { name: "RAZORPAY_KEY_ID", required: "always", purpose: "Razorpay key id (rzp_test_… or rzp_live_…)" },
  { name: "RAZORPAY_KEY_SECRET", required: "always", purpose: "Razorpay key secret" },
  { name: "RAZORPAY_WEBHOOK_SECRET", required: "prod", purpose: "Razorpay webhook signing secret" },
  { name: "OTP_PROVIDER", required: "prod", purpose: "console (dev only) | msg91 | twilio" },
  { name: "UPSTASH_REDIS_REST_URL", required: "optional", purpose: "Rate limiting (recommended in production)" },
  { name: "UPSTASH_REDIS_REST_TOKEN", required: "optional", purpose: "Rate limiting (recommended in production)" },
  { name: "CRON_SECRET", required: "prod", purpose: "Protects /api/cron/* endpoints" },
  { name: "NEXT_PUBLIC_WHATSAPP_NUMBER", required: "optional", purpose: "Fallback WhatsApp support number" },
  // Legacy variables (used by the old code; reported so you know what is still configured)
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: "optional", purpose: "LEGACY — not needed by the new server code" },
  { name: "NEXT_PUBLIC_RAZORPAY_KEY_ID", required: "optional", purpose: "LEGACY — key id is now sent by the server" },
  { name: "ADMIN_PASSWORD", required: "optional", purpose: "LEGACY — unused, safe to delete" },
];

const isSet = (n) => typeof process.env[n] === "string" && process.env[n].trim() !== "";
let missing = 0;

console.log(`Environment check (${prod ? "production" : "development"} rules)\n`);
for (const v of VARS) {
  const present = isSet(v.name) || (v.aliases || []).some(isSet);
  const needed = v.required === "always" || (prod && v.required === "prod");
  const status = present ? "set     " : needed ? "MISSING " : "not set ";
  if (!present && needed) missing++;
  const via = !isSet(v.name) && present ? ` (via ${v.aliases.find(isSet)})` : "";
  console.log(`${status} ${v.name.padEnd(30)} ${v.purpose}${via}`);
}

// Safe metadata (never the secret itself)
const kid = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
const mode = kid.startsWith("rzp_test_") ? "test" : kid.startsWith("rzp_live_") ? "LIVE" : kid ? "unrecognised format" : "unset";
console.log(`\nRazorpay key mode: ${mode}`);
if (isSet("SESSION_SECRET") && process.env.SESSION_SECRET.length < 32) {
  console.log("WARNING: SESSION_SECRET is shorter than 32 characters");
  missing++;
}
if (prod && process.env.OTP_PROVIDER === "console") {
  console.log("ERROR: OTP_PROVIDER=console is not allowed in production");
  missing++;
}

// Safe database metadata: connection type, port and region — never user or password.
if (isSet("DATABASE_URL")) {
  try {
    const u = new URL(process.env.DATABASE_URL);
    const pooler = u.hostname.endsWith(".pooler.supabase.com");
    const region = pooler ? (u.hostname.match(/^aws-\d+-([a-z0-9-]+)\.pooler/)?.[1] ?? "unknown") : "n/a";
    const kind = pooler ? (u.port === "6543" ? "Supabase transaction pooler (good for Vercel)" : `Supabase session pooler (port ${u.port || "5432"}; use 6543 on Vercel)`) : u.hostname.endsWith(".supabase.co") ? "Supabase DIRECT connection (use the transaction pooler on Vercel)" : "non-Supabase host";
    console.log(`Database: ${kind}; region: ${region}`);
  } catch {
    console.log("Database: DATABASE_URL is not a valid URL");
    missing++;
  }
}

console.log(missing ? `\n${missing} problem(s) found.` : "\nAll required variables are set.");
process.exit(missing ? 1 : 0);
