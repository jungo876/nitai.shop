import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startMigratedDb, MIGRATIONS_DIR } from "./helpers/migrated-db";
import { applyMigrations, migrationStatus } from "../scripts/lib/migrator.mjs";

let ctx: Awaited<ReturnType<typeof startMigratedDb>>;

beforeAll(async () => {
  ctx = await startMigratedDb();
});
afterAll(async () => ctx?.cleanup());

describe("migrations on a fresh database", () => {
  it("applies every migration and records it", async () => {
    const status = await migrationStatus(ctx.sql, MIGRATIONS_DIR);
    expect(status.pending).toHaveLength(0);
    expect(status.applied.length).toBeGreaterThanOrEqual(3);
  });

  it("is a no-op when run again", async () => {
    const done = await applyMigrations(ctx.sql, { dir: MIGRATIONS_DIR });
    expect(done).toHaveLength(0);
  });

  it("creates the expected tables", async () => {
    const rows = await ctx.sql`select tablename from pg_tables where schemaname = 'public' order by 1`;
    const names = rows.map((r) => r.tablename);
    for (const t of [
      "addresses", "admin_activity_logs", "bulk_prices", "business_profiles", "cart_items", "companies",
      "homepage_banners", "order_items", "orders", "otp_challenges", "product_variants", "products",
      "schema_migrations", "sessions", "store_settings", "users", "wishlist_items",
    ]) {
      expect(names).toContain(t);
    }
  });

  it("enables row level security on every public table", async () => {
    const rows = await ctx.sql`
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`;
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it("creates the single store_settings row with defaults", async () => {
    const rows = await ctx.sql`select * from store_settings`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, store_status: "open", cod_enabled: true, cod_advance_percent: 10 });
  });

  it("assigns sequential order numbers and enforces status values", async () => {
    const [u] = await ctx.sql`insert into users (phone_number) values ('9876543210') returning id`;
    const [o1] = await ctx.sql`insert into orders (user_id, total_amount, advance_amount, remaining_amount, payment_method)
                               values (${u.id}, 100, 10, 90, 'cod') returning order_number`;
    const [o2] = await ctx.sql`insert into orders (user_id, total_amount, advance_amount, remaining_amount, payment_method)
                               values (${u.id}, 100, 100, 0, 'prepaid') returning order_number`;
    expect(o2.order_number).toBe(o1.order_number + 1);
    await expect(
      ctx.sql`insert into orders (user_id, total_amount, advance_amount, remaining_amount, payment_method, payment_status)
              values (${u.id}, 100, 100, 0, 'prepaid', 'fully_paid')`
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      ctx.sql`insert into orders (user_id, total_amount, advance_amount, remaining_amount, payment_method)
              values (${u.id}, 100, 50, 10, 'cod')`
    ).rejects.toMatchObject({ code: "23514" }); // advance + remaining must equal total
  });
});

describe("public API role (anon) after lockdown", () => {
  beforeAll(async () => {
    const [c] = await ctx.sql`insert into companies (name) values ('Brand A') returning id`;
    const [visible] = await ctx.sql`insert into products (name, category, company_id) values ('Visible', 'Insecticide', ${c.id}) returning id`;
    await ctx.sql`insert into products (name, category, status) values ('Secret', 'Insecticide', 'hidden')`;
    await ctx.sql`insert into product_variants (product_id, label, unit_price, units_per_box) values (${visible.id}, '1 L', 500, 10)`;
  });

  async function asAnon<T>(fn: (tx: typeof ctx.sql) => Promise<T>): Promise<T> {
    // Run inside a transaction so SET LOCAL ROLE is undone afterwards.
    let result: T;
    await ctx.sql.begin(async (tx) => {
      await tx`set local role anon`;
      result = await fn(tx as unknown as typeof ctx.sql);
    });
    return result!;
  }

  it("can read visible products but not hidden ones", async () => {
    const rows = await asAnon((tx) => tx`select name from products order by name`);
    expect(rows.map((r) => r.name)).toEqual(["Visible"]);
  });

  it("can read variants and brands", async () => {
    const variants = await asAnon((tx) => tx`select label from product_variants`);
    expect(variants).toHaveLength(1);
    const brands = await asAnon((tx) => tx`select name from companies`);
    expect(brands.map((r) => r.name)).toContain("Brand A");
  });

  it("cannot read customers, orders, sessions or OTPs", async () => {
    for (const table of ["users", "orders", "order_items", "cart_items", "addresses", "business_profiles", "sessions", "otp_challenges", "store_settings", "admin_activity_logs"]) {
      await expect(asAnon((tx) => tx.unsafe(`select * from public.${table} limit 1`))).rejects.toMatchObject({ code: "42501" });
    }
  });

  it("cannot write anything", async () => {
    await expect(asAnon((tx) => tx`insert into users (phone_number) values ('9999999999')`)).rejects.toMatchObject({ code: "42501" });
    await expect(asAnon((tx) => tx`update products set name = 'pwned'`)).rejects.toMatchObject({ code: "42501" });
    await expect(asAnon((tx) => tx`delete from companies`)).rejects.toMatchObject({ code: "42501" });
  });
});
