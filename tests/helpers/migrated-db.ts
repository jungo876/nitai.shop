import path from "node:path";
import { fileURLToPath } from "node:url";
import { startTestDb } from "./test-db";
import { applyMigrations } from "../../scripts/lib/migrator.mjs";

export const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations");

/**
 * Starts a fresh test database, applies all migrations, and points the app's
 * db() at it (DATABASE_URL). Call `cleanup()` in afterAll.
 */
export async function startMigratedDb(opts: { beforeMigrate?: (pg: import("@electric-sql/pglite").PGlite) => Promise<void> } = {}) {
  const t = await startTestDb();
  if (opts.beforeMigrate) await opts.beforeMigrate(t.pg);
  process.env.DATABASE_URL = t.url;
  process.env.DATABASE_POOL_MAX = "1";
  const { resetEnvCache } = await import("@/server/env");
  resetEnvCache();
  const { db, closeDb } = await import("@/server/db");
  await applyMigrations(db(), { dir: MIGRATIONS_DIR });
  return {
    url: t.url,
    pg: t.pg,
    sql: db(),
    async cleanup() {
      await closeDb();
      await t.stop();
    },
  };
}
