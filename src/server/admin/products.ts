import "server-only";
import { db, PG, pgErrorCode, type Tx } from "../db";
import { conflict, notFound } from "../http";
import { getProduct } from "../catalog";
import type { ProductInput } from "@/lib/validations/product";

/**
 * Product writes (admin only — callers must check permissions).
 *
 * Variants and bulk tiers are synchronised IN PLACE by id:
 *  - rows the admin kept are updated (customers' cart items stay valid),
 *  - rows the admin removed are deleted (their cart items go with them, via FK),
 *  - new rows are inserted.
 * A tier whose box count changes is replaced, because its meaning changed.
 */

async function syncVariants(tx: Tx, productId: string, variants: ProductInput["variants"]) {
  const existing = await tx`select id from product_variants where product_id = ${productId}`;
  const existingIds = new Set(existing.map((r) => r.id as string));
  const keepIds = variants.map((v) => v.id).filter((id): id is string => !!id && existingIds.has(id));

  await tx`delete from product_variants where product_id = ${productId} and id <> all(${keepIds}::uuid[])`;

  for (const v of variants) {
    let variantId: string;
    if (v.id && existingIds.has(v.id)) {
      variantId = v.id;
      await tx`update product_variants set label = ${v.label}, unit_price = ${v.unit_price}, units_per_box = ${v.units_per_box}
               where id = ${variantId}`;
    } else {
      const [row] = await tx`insert into product_variants (product_id, label, unit_price, units_per_box)
                             values (${productId}, ${v.label}, ${v.unit_price}, ${v.units_per_box}) returning id`;
      variantId = row.id;
    }
    await syncTiers(tx, variantId, v.bulk_prices);
  }
}

async function syncTiers(tx: Tx, variantId: string, tiers: ProductInput["variants"][number]["bulk_prices"]) {
  const existing = await tx`select id, box_count from bulk_prices where variant_id = ${variantId}`;
  const byId = new Map(existing.map((r) => [r.id as string, Number(r.box_count)]));
  // Keep a tier only if it is sent back with the same box count.
  const keep = tiers.filter((t) => t.id && byId.get(t.id) === t.box_count);
  const keepIds = keep.map((t) => t.id as string);
  await tx`delete from bulk_prices where variant_id = ${variantId} and id <> all(${keepIds}::uuid[])`;
  for (const t of keep) {
    await tx`update bulk_prices set price_per_unit = ${t.price_per_unit}, tag = ${t.tag} where id = ${t.id!}`;
  }
  for (const t of tiers.filter((t) => !keep.includes(t))) {
    await tx`insert into bulk_prices (variant_id, box_count, price_per_unit, tag)
             values (${variantId}, ${t.box_count}, ${t.price_per_unit}, ${t.tag})`;
  }
}

async function assertCompany(tx: Tx, companyId: string | null) {
  if (!companyId) return;
  const [c] = await tx`select 1 from companies where id = ${companyId}`;
  if (!c) throw notFound("Brand not found.");
}

export async function createProduct(input: ProductInput) {
  const id = await db().begin(async (tx) => {
    await assertCompany(tx, input.company_id);
    const [p] = await tx`
      insert into products (name, category, home_category, description, image_url, company_id, is_top_selling, status)
      values (${input.name}, ${input.category}, ${input.home_category}, ${input.description}, ${input.image_url},
              ${input.company_id}, ${input.is_top_selling}, ${input.status})
      returning id`;
    await syncVariants(tx, p.id, input.variants);
    return p.id as string;
  });
  return getProduct(id, { includeHidden: true });
}

export async function updateProduct(id: string, input: ProductInput) {
  await db().begin(async (tx) => {
    await assertCompany(tx, input.company_id);
    const r = await tx`
      update products set name = ${input.name}, category = ${input.category}, home_category = ${input.home_category},
             description = ${input.description}, image_url = ${input.image_url}, company_id = ${input.company_id},
             is_top_selling = ${input.is_top_selling}, status = ${input.status}
      where id = ${id}`;
    if (r.count === 0) throw notFound("Product not found.");
    await syncVariants(tx, id, input.variants);
  });
  return getProduct(id, { includeHidden: true });
}

/**
 * Deletes a product. Past orders keep their own copy of the name and price
 * (order_items is a snapshot), so order history is not affected.
 */
export async function deleteProduct(id: string) {
  const r = await db()`delete from products where id = ${id}`;
  if (r.count === 0) throw notFound("Product not found.");
}

export async function createCompany(input: { name: string; logo_url: string }) {
  try {
    const [c] = await db()`insert into companies (name, logo_url) values (${input.name}, ${input.logo_url}) returning id, name, logo_url, created_at`;
    return c;
  } catch (err) {
    if (pgErrorCode(err) === PG.uniqueViolation) throw conflict("A brand with this name already exists.");
    throw err;
  }
}

export async function updateCompany(id: string, input: { name: string; logo_url: string }) {
  try {
    const [c] = await db()`update companies set name = ${input.name}, logo_url = ${input.logo_url} where id = ${id}
                           returning id, name, logo_url, created_at`;
    if (!c) throw notFound("Brand not found.");
    return c;
  } catch (err) {
    if (pgErrorCode(err) === PG.uniqueViolation) throw conflict("A brand with this name already exists.");
    throw err;
  }
}

/** Deleting a brand keeps its products (they just lose the brand). */
export async function deleteCompany(id: string) {
  const r = await db()`delete from companies where id = ${id}`;
  if (r.count === 0) throw notFound("Brand not found.");
}
