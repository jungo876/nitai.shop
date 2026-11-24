import "server-only";
import postgres from "postgres";
import { env, requireEnv } from "./env";

/**
 * Server-side Postgres access (Supabase pooler in production, local Postgres in
 * tests). The browser never talks to the database; every query goes through an
 * API route that has already checked who the user is.
 *
 * Usage:
 *   const sql = db();
 *   const rows = await sql`select * from products where id = ${id}`;
 *   await sql.begin(async (tx) => { ... });   // transaction
 */

const toNumber = (x: string) => Number(x);

function create(url: string) {
  const e = env();
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\//.test(url);
  const ssl = e.DATABASE_SSL === "disable" ? false : e.DATABASE_SSL ?? (isLocal ? false : "require");

  return postgres(url, {
    // Supabase's transaction pooler cannot keep named prepared statements.
    prepare: false,
    // Serverless functions each hold a small pool; the pooler multiplexes them.
    max: e.DATABASE_POOL_MAX ?? (process.env.VERCEL ? 3 : 10),
    idle_timeout: 20,
    connect_timeout: 10,
    ssl,
    onnotice: () => {},
    connection: { application_name: "nck-web" },
    // Money is stored as numeric(12,2) and counts as bigint; both are safe as JS numbers here.
    types: {
      numeric: { to: 1700, from: [1700], serialize: (x: unknown) => String(x), parse: toNumber },
      int8: { to: 20, from: [20], serialize: (x: unknown) => String(x), parse: toNumber },
    },
  });
}

export type Sql = ReturnType<typeof create>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tx = postgres.TransactionSql<any>;
/** Something that can run queries: the pool or an open transaction. */
export type Queryable = Sql | Tx;

const globalForDb = globalThis as unknown as { __nckSql?: Sql; __nckSqlUrl?: string };

export function db(): Sql {
  const url = requireEnv("DATABASE_URL");
  // Re-create if the URL changed (tests switch databases between files).
  if (globalForDb.__nckSql && globalForDb.__nckSqlUrl === url) return globalForDb.__nckSql;
  globalForDb.__nckSql = create(url);
  globalForDb.__nckSqlUrl = url;
  return globalForDb.__nckSql;
}

/** Closes the pool (scripts and tests). */
export async function closeDb() {
  const sql = globalForDb.__nckSql;
  globalForDb.__nckSql = undefined;
  globalForDb.__nckSqlUrl = undefined;
  if (sql) await sql.end({ timeout: 5 });
}

/** Postgres error codes we react to. */
export const PG = {
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
  checkViolation: "23514",
} as const;

export function pgErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : undefined;
}
