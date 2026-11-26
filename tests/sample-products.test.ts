import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { startMigratedDb } from "./helpers/migrated-db";

let ctx: Awaited<ReturnType<typeof startMigratedDb>>;
beforeAll(async () => {
  ctx = await startMigratedDb();
});
afterAll(async () => ctx?.cleanup());

// DATABASE_URL is passed explicitly so the script can only reach the test database.
const run = (mode: string) =>
  new Promise<{ code: number; out: string }>((resolve) =>
    execFile(process.execPath, ["scripts/sample-products.mjs", mode], { env: { ...process.env, DATABASE_URL: ctx.url } }, (err, stdout, stderr) =>
      resolve({ code: err ? 1 : 0, out: stdout + stderr })
    )
  );

describe("sample products script", () => {
  it("adds valid products once, shows them in the catalogue, and can hide them", async () => {
    const first = await run("add");
    expect(first.code, first.out).toBe(0);
    expect(first.out).toMatch(/Added 13 sample/);
    expect((await run("add")).out).toMatch(/Added 0 sample/); // idempotent

    const { listProducts } = await import("@/server/catalog");
    const products = await listProducts({ limit: 100 });
    expect(products).toHaveLength(13);
    for (const p of products) {
      expect(p.product_variants.length).toBeGreaterThan(0);
      expect(p.description).toMatch(/read the label/);
    }

    expect((await run("hide")).out).toMatch(/Hid 13/);
    expect(await listProducts({ limit: 100 })).toHaveLength(0);
  });
});
