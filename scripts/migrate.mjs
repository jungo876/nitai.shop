#!/usr/bin/env node
/**
 * Apply database migrations from supabase/migrations/.
 *
 *   npm run db:migrate              # apply pending migrations (uses DATABASE_URL)
 *   npm run db:migrate -- --status  # list applied / pending, change nothing
 *   npm run db:migrate -- --url=postgres://...   # explicit database
 *
 * Always run `npm run db:backup` before migrating a database with real data.
 */
import nextEnv from "@next/env";
import postgres from "postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyMigrations, migrationStatus } from "./lib/migrator.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, process.env.NODE_ENV !== "production");

const urlArg = process.argv.find((a) => a.startsWith("--url="))?.slice(6);
const url = urlArg || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (add it to .env.local or pass --url=...)");
  process.exit(1);
}
const host = (() => { try { return new URL(url).hostname; } catch { return "(unparseable url)"; } })();
const local = /^(localhost|127\.0\.0\.1)$/.test(host);

const sql = postgres(url, { prepare: false, max: 1, ssl: local ? false : "require", onnotice: () => {} });
const dir = path.join(root, "supabase", "migrations");

try {
  console.log(`Database host: ${host}`);
  if (process.argv.includes("--status")) {
    const s = await migrationStatus(sql, dir);
    for (const m of s.applied) console.log(`applied  ${m.file}`);
    for (const m of s.pending) console.log(`pending  ${m.file}`);
    for (const m of s.changed) console.log(`CHANGED  ${m.file}  (edited after being applied!)`);
    if (!s.pending.length) console.log("Database is up to date.");
  } else {
    const done = await applyMigrations(sql, { dir, log: (m) => console.log(m) });
    console.log(done.length ? `Done: ${done.length} migration(s) applied.` : "Database is up to date.");
  }
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
