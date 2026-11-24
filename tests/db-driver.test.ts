import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestDb } from "./helpers/test-db";

/**
 * Proves the production database driver works against the test database:
 * plain queries, numeric/bigint parsing, jsonb, uuid[] parameters, and
 * transactions that roll back on error.
 */
let stop: () => Promise<void>;
let dbModule: typeof import("@/server/db");

beforeAll(async () => {
  const t = await startTestDb();
  stop = t.stop;
  process.env.DATABASE_URL = t.url;
  process.env.DATABASE_POOL_MAX = "1";
  (await import("@/server/env")).resetEnvCache();
  dbModule = await import("@/server/db");
});

afterAll(async () => {
  await dbModule?.closeDb();
  await stop?.();
});

describe("postgres driver against test database", () => {
  it("runs queries and parses numeric and bigint as numbers", async () => {
    const sql = dbModule.db();
    const [row] = await sql`select 1234.50::numeric(12,2) as price, count(*) as n from (values (1),(2)) v(x)`;
    expect(row.price).toBe(1234.5);
    expect(row.n).toBe(2);
  });

  it("round-trips jsonb and uuid[] parameters", async () => {
    const sql = dbModule.db();
    await sql`create table t_json (id uuid primary key default gen_random_uuid(), data jsonb not null)`;
    const [inserted] = await sql`insert into t_json (data) values (${sql.json({ city: "Howrah", pin: "711101" })}) returning id, data`;
    expect(inserted.data).toEqual({ city: "Howrah", pin: "711101" });
    const ids = [inserted.id as string];
    const found = await sql`select id from t_json where id = any(${ids}::uuid[])`;
    expect(found).toHaveLength(1);
  });

  it("rolls back a failed transaction", async () => {
    const sql = dbModule.db();
    await sql`create table t_tx (n int primary key)`;
    await expect(
      sql.begin(async (tx) => {
        await tx`insert into t_tx values (1)`;
        await tx`insert into t_tx values (1)`; // duplicate -> error
      })
    ).rejects.toMatchObject({ code: dbModule.PG.uniqueViolation });
    const rows = await sql`select * from t_tx`;
    expect(rows).toHaveLength(0);
  });
});
