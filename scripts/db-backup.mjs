#!/usr/bin/env node
/**
 * Logical backup of the database (no pg_dump needed).
 *
 *   npm run db:backup                 # uses DATABASE_URL
 *   npm run db:backup -- --url=...    # explicit database
 *
 * Writes backups/<timestamp>/ with:
 *   schema.json   tables, columns, constraints, indexes, RLS policies, grants,
 *                 functions/triggers, storage buckets + policies
 *   data/<table>.json  every row of every table in the public schema
 *   summary.txt   row counts
 * Restore: scripts/db-restore.mjs (inserts the JSON rows back table by table).
 *
 * backups/ is git-ignored: it contains customer data. Keep copies somewhere safe.
 */
import nextEnv from "@next/env";
import postgres from "postgres";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
nextEnv.loadEnvConfig(root, true);
const url = process.argv.find((a) => a.startsWith("--url="))?.slice(6) || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const host = new URL(url).hostname;
const local = /^(localhost|127\.0\.0\.1)$/.test(host);
const sql = postgres(url, { prepare: false, max: 1, ssl: local ? false : "require", onnotice: () => {} });

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = path.join(root, "backups", stamp);
mkdirSync(path.join(outDir, "data"), { recursive: true });

try {
  const tables = (await sql`select tablename from pg_tables where schemaname = 'public' order by 1`).map((r) => r.tablename);
  const schema = {
    host,
    taken_at: new Date().toISOString(),
    server_version: (await sql`show server_version`)[0].server_version,
    columns: await sql`
      select table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position, is_identity
      from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`,
    constraints: await sql`
      select conrelid::regclass::text as table_name, conname, contype, pg_get_constraintdef(oid) as definition
      from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`,
    indexes: await sql`select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2`,
    rls: await sql`
      select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
             pg_get_userbyid(c.relowner) as owner
      from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' order by 1`,
    policies: await sql`select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies
                        where schemaname in ('public', 'storage') order by 1, 2, 3`,
    grants: await sql`select table_name, grantee, privilege_type from information_schema.role_table_grants
                      where table_schema = 'public' order by 1, 2, 3`,
    functions: await sql`
      select p.proname as name, pg_get_functiondef(p.oid) as definition
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f' order by 1`,
    triggers: await sql`select event_object_table as table_name, trigger_name, action_timing, event_manipulation, action_statement
                        from information_schema.triggers where trigger_schema = 'public' order by 1, 2`,
    storage_buckets: await sql`select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by 1`.catch(() => []),
  };
  writeFileSync(path.join(outDir, "schema.json"), JSON.stringify(schema, null, 2));

  const summary = [`Backup of ${host} at ${schema.taken_at} (PostgreSQL ${schema.server_version})`, ""];
  for (const t of tables) {
    const rows = await sql.unsafe(`select * from public."${t.replace(/"/g, '""')}"`);
    writeFileSync(path.join(outDir, "data", `${t}.json`), JSON.stringify(rows, null, 2));
    summary.push(`${t.padEnd(28)} ${rows.length} rows`);
  }
  const objects = await sql`select bucket_id, count(*)::int as n from storage.objects group by 1 order by 1`.catch(() => []);
  for (const o of objects) summary.push(`storage:${o.bucket_id.padEnd(20)} ${o.n} files (files themselves stay in Supabase Storage)`);
  writeFileSync(path.join(outDir, "summary.txt"), summary.join("\n") + "\n");
  console.log(summary.join("\n"));
  console.log(`\nBackup written to ${path.relative(root, outDir)}`);
} catch (err) {
  console.error("Backup failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
