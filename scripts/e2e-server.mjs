#!/usr/bin/env node
/**
 * Starts a fully isolated copy of the site for end-to-end tests:
 *   - an in-memory PostgreSQL (PGlite) with all migrations + demo data
 *   - a fake Razorpay API
 *   - the PRODUCTION build (`next start`) pointed at both
 * Nothing touches the real database or Razorpay. Requires `next build` first.
 */
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
  outbox: path.join(root, "test-results", "otp-outbox.jsonl"),
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

await startRazorpayMock({ port: E2E.rzpPort, keyId: E2E.keyId, keySecret: E2E.keySecret });

const env = {
  ...process.env,
  NODE_ENV: "production",
  APP_ENV: "test",
  PORT: String(E2E.appPort),
  DATABASE_URL: dbUrl,
  DATABASE_POOL_MAX: "4",
  OTP_PROVIDER: "console",
  OTP_CONSOLE_OUTBOX: E2E.outbox,
  RAZORPAY_KEY_ID: E2E.keyId,
  RAZORPAY_KEY_SECRET: E2E.keySecret,
  RAZORPAY_WEBHOOK_SECRET: "e2e_webhook_secret",
  RAZORPAY_API_BASE: `http://127.0.0.1:${E2E.rzpPort}`,
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
