#!/usr/bin/env node
/**
 * Starts a fully isolated copy of the site for end-to-end tests:
 *   - an in-memory PostgreSQL (PGlite) with all migrations + demo data
 *   - a fake Razorpay API
 *   - the PRODUCTION build (`next start`) pointed at both
 * Nothing touches the real database or Razorpay. Requires `next build` first.
 *
 * With --sandbox (npm run sandbox) it is a private playground for the owner:
 * payments use your Razorpay TEST keys from .env.local (real test checkout, no
 * real money; live keys are refused). Login codes are printed in this terminal.
 */
import nextEnv from "@next/env";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import postgres from "postgres";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyMigrations } from "./lib/migrator.mjs";
import { seedDemoData } from "./lib/seed-data.mjs";
import { startRazorpayMock } from "./lib/razorpay-mock.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const E2E = {
  appPort: 3100,
  rzpPort: 3199,
  adminPhone: "9000000001",
  keyId: "rzp_test_e2emockkey",
  keySecret: "e2e_mock_key_secret",
  // not under test-results/: Playwright empties that folder at the start of a run
  outbox: path.join(root, ".data", "e2e", "otp-outbox.jsonl"),
};

if (!existsSync(path.join(root, ".next", "BUILD_ID"))) {
  console.error("No production build found. Run `npx next build` first (npm run test:e2e does this).");
  process.exit(1);
}

mkdirSync(path.dirname(E2E.outbox), { recursive: true });
writeFileSync(E2E.outbox, "");

const pg = await PGlite.create();
await pg.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;`);
const dbServer = new PGLiteSocketServer({ db: pg, port: 0, host: "127.0.0.1", maxConnections: 10 });
await dbServer.start();
const dbUrl = `postgres://postgres:postgres@${dbServer.getServerConn()}/postgres`;

const sql = postgres(dbUrl, { max: 1, prepare: false, onnotice: () => {} });
await applyMigrations(sql, { dir: path.join(root, "supabase", "migrations") });
await seedDemoData(sql, { adminPhone: E2E.adminPhone });
await sql.end();

const sandbox = process.argv.includes("--sandbox");
let razorpay = { RAZORPAY_KEY_ID: E2E.keyId, RAZORPAY_KEY_SECRET: E2E.keySecret, RAZORPAY_API_BASE: `http://127.0.0.1:${E2E.rzpPort}` };
if (sandbox) {
  // Read only the Razorpay keys from .env.local; everything else stays isolated.
  const { combinedEnv } = nextEnv.loadEnvConfig(root, true, { info: () => {}, error: console.error });
  const id = combinedEnv.RAZORPAY_KEY_ID ?? "";
  if (!id.startsWith("rzp_test_") || !combinedEnv.RAZORPAY_KEY_SECRET) {
    console.error("Sandbox needs Razorpay TEST keys (rzp_test_…) in .env.local. Live keys are never used here.");
    process.exit(1);
  }
  razorpay = { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: combinedEnv.RAZORPAY_KEY_SECRET, RAZORPAY_API_BASE: "https://api.razorpay.com" };
} else {
  await startRazorpayMock({ port: E2E.rzpPort, keyId: E2E.keyId, keySecret: E2E.keySecret });
}

const env = {
  ...process.env,
  NODE_ENV: "production",
  APP_ENV: "test",
  PORT: String(E2E.appPort),
  DATABASE_URL: dbUrl,
  // PGlite serves one query at a time; parallel connections interleave protocol messages.
  DATABASE_POOL_MAX: "1",
  OTP_PROVIDER: "console",
  OTP_CONSOLE_OUTBOX: E2E.outbox,
  ...razorpay,
  RAZORPAY_WEBHOOK_SECRET: "e2e_webhook_secret",
  SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789",
  CRON_SECRET: "e2e-cron-secret-0123456789",
  // keep real third-party services out of tests
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_URL: "",
  SUPABASE_SECRET_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  APP_URL: `http://localhost:${E2E.appPort}`,
};

if (sandbox) {
  console.log(`
  ┌──────────────────────────────────────────────────────────────────────┐
  │ NCK Agro SANDBOX — demo data, nothing real is touched                 │
  │ Open      http://localhost:${E2E.appPort}                                    │
  │ Admin     log in with ${E2E.adminPhone} (any number works as a customer)  │
  │ Codes     the 6-digit login code is printed below as [DEV OTP]        │
  │ Payments  Razorpay TEST mode: UPI id success@razorpay, or test cards  │
  │ Stop      Ctrl+C (all sandbox data is thrown away)                    │
  └──────────────────────────────────────────────────────────────────────┘`);
}

const child = spawn(process.execPath, [path.join(root, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(E2E.appPort)], {
  cwd: root,
  env,
  stdio: "inherit",
});
const stop = () => {
  child.kill();
  dbServer.stop().finally(() => process.exit(0));
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => process.exit(code ?? 0));
