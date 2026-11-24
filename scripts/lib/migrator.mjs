/**
 * Minimal, dependency-free migration runner (used by scripts/migrate.mjs and tests).
 *
 * - Files: supabase/migrations/<14 digits>_<name>.sql, applied in order.
 * - Each file runs in its own transaction together with its bookkeeping row,
 *   so a failing migration leaves no partial changes.
 * - Applied versions + checksums are stored in public.schema_migrations.
 *   Editing an already-applied file is reported as an error.
 * - A transaction-level advisory lock prevents two runners at once.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const FILE_RE = /^(\d{14})_([a-z0-9_]+)\.sql$/;
const LOCK_KEY = 728_461_93; // arbitrary constant for pg_advisory_xact_lock

export function readMigrations(dir) {
  return readdirSync(dir)
    .filter((f) => FILE_RE.test(f))
    .sort()
    .map((file) => {
      const [, version, name] = file.match(FILE_RE);
      // Normalise line endings so Windows and Linux checkouts get the same checksum.
      const sqlText = readFileSync(path.join(dir, file), "utf8").replace(/\r\n/g, "\n");
      const checksum = createHash("sha256").update(sqlText).digest("hex");
      return { version, name, file, sql: sqlText, checksum };
    });
}

async function ensureTable(sql) {
  await sql.unsafe(`
    create table if not exists public.schema_migrations (
      version    text primary key,
      name       text not null,
      checksum   text not null,
      applied_at timestamptz not null default now()
    );
    alter table public.schema_migrations enable row level security;
  `);
}

/** Returns { applied: [...], pending: [...], changed: [...] } without changing anything. */
export async function migrationStatus(sql, dir) {
  await ensureTable(sql);
  const files = readMigrations(dir);
  const rows = await sql`select version, checksum from public.schema_migrations`;
  const applied = new Map(rows.map((r) => [r.version, r.checksum]));
  return {
    applied: files.filter((f) => applied.has(f.version)),
    pending: files.filter((f) => !applied.has(f.version)),
    changed: files.filter((f) => applied.has(f.version) && applied.get(f.version) !== f.checksum),
  };
}

/**
 * Applies pending migrations. Returns the list of applied files.
 * @param {import('postgres').Sql} sql
 * @param {{ dir: string, log?: (msg: string) => void, dryRun?: boolean }} opts
 */
export async function applyMigrations(sql, { dir, log = () => {}, dryRun = false }) {
  const status = await migrationStatus(sql, dir);
  if (status.changed.length) {
    throw new Error(
      `Already-applied migration(s) were edited: ${status.changed.map((m) => m.file).join(", ")}. ` +
        `Create a new migration instead of changing an applied one.`
    );
  }
  if (dryRun) {
    for (const m of status.pending) log(`pending  ${m.file}`);
    return [];
  }
  const done = [];
  for (const m of status.pending) {
    log(`applying ${m.file} ...`);
    await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${LOCK_KEY})`;
      const [already] = await tx`select 1 from public.schema_migrations where version = ${m.version}`;
      if (already) return; // another runner applied it meanwhile
      await tx.unsafe(m.sql);
      await tx`insert into public.schema_migrations (version, name, checksum) values (${m.version}, ${m.name}, ${m.checksum})`;
    });
    log(`applied  ${m.file}`);
    done.push(m);
  }
  return done;
}
