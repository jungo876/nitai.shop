import "server-only";
import { db, type Queryable } from "./db";

/**
 * Catalogue reads. Products are returned in the shape the UI already uses
 * (`ProductWithVariants`: product + `companies` + `product_variants[].bulk_prices[]`),
 * built in a single query with JSON aggregation (no per-product queries).
 */

export const PRODUCT_STATUSES = ["active", "out_of_stock", "coming_soon", "hidden"] as const;

export interface ProductFilters {
  search?: string | null;
  companyId?: string | null;
  category?: string | null;
  homeCategory?: string | null;
  topSelling?: boolean;
  includeHidden?: boolean;
  ids?: string[];
  excludeIds?: string[];
  limit?: number;
  offset?: number;
}

/** Escape LIKE wildcards in user input. */
function likePattern(s: string) {
  return `%${s.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
}

export async function listProducts(f: ProductFilters = {}, sql: Queryable = db()) {
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 200);
  const offset = Math.max(f.offset ?? 0, 0);
  const search = f.search?.trim() ? likePattern(f.search.trim().slice(0, 100)) : null;

  const rows = await sql`
    select p.id, p.name, p.category, p.home_category, p.description, p.image_url, p.company_id,
           p.is_top_selling, p.status, p.created_at,
           case when c.id is null then null
                else jsonb_build_object('id', c.id, 'name', c.name, 'logo_url', c.logo_url, 'created_at', c.created_at) end as companies,
           coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id', v.id, 'product_id', v.product_id, 'label', v.label,
                      'unit_price', v.unit_price, 'units_per_box', v.units_per_box, 'created_at', v.created_at,
                      'bulk_prices', coalesce((
                         select jsonb_agg(jsonb_build_object(
                                  'id', b.id, 'variant_id', b.variant_id, 'box_count', b.box_count,
                                  'price_per_unit', b.price_per_unit, 'tag', b.tag, 'created_at', b.created_at)
                                order by b.box_count)
                         from bulk_prices b where b.variant_id = v.id), '[]'::jsonb))
                    order by v.created_at, v.id)
             from product_variants v where v.product_id = p.id), '[]'::jsonb) as product_variants
    from products p
    left join companies c on c.id = p.company_id
    where true
      ${f.includeHidden ? sql`` : sql`and p.status <> 'hidden'`}
      ${f.companyId ? sql`and p.company_id = ${f.companyId}` : sql``}
      ${f.category ? sql`and p.category = ${f.category}` : sql``}
      ${f.homeCategory ? sql`and p.home_category = ${f.homeCategory}` : sql``}
      ${f.topSelling ? sql`and p.is_top_selling` : sql``}
      ${f.ids?.length ? sql`and p.id = any(${f.ids}::uuid[])` : sql``}
      ${f.excludeIds?.length ? sql`and p.id <> all(${f.excludeIds}::uuid[])` : sql``}
      ${search ? sql`and (p.name ilike ${search} or p.category ilike ${search} or c.name ilike ${search})` : sql``}
    order by p.created_at desc, p.id
    limit ${limit} offset ${offset}`;
  return rows.map(normaliseProduct);
}

export async function getProduct(id: string, opts: { includeHidden?: boolean } = {}, sql: Queryable = db()) {
  const [p] = await listProducts({ ids: [id], includeHidden: opts.includeHidden, limit: 1 }, sql);
  return p ?? null;
}

/** Same category first, then same brand; never the product itself or hidden ones. */
export async function recommendedProducts(id: string, limit = 6) {
  const sql = db();
  const [p] = await sql`select category, company_id from products where id = ${id} and status <> 'hidden'`;
  if (!p) return null;
  const sameCategory = await listProducts({ category: p.category, excludeIds: [id], limit });
  if (sameCategory.length >= limit || !p.company_id) return sameCategory;
  const more = await listProducts({
    companyId: p.company_id,
    excludeIds: [id, ...sameCategory.map((x) => x.id)],
    limit: limit - sameCategory.length,
  });
  return [...sameCategory, ...more];
}

function normaliseProduct(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    home_category: (r.home_category as string | null) ?? null,
    description: (r.description as string) ?? "",
    image_url: (r.image_url as string) ?? "",
    company_id: (r.company_id as string | null) ?? null,
    is_top_selling: Boolean(r.is_top_selling),
    status: r.status as (typeof PRODUCT_STATUSES)[number],
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    companies: (r.companies as Record<string, unknown> | null) ?? null,
    product_variants: (r.product_variants as Array<Record<string, unknown>>) ?? [],
  };
}

export type CatalogProduct = ReturnType<typeof normaliseProduct>;

export async function listCompanies() {
  return db()`
    select c.id, c.name, c.logo_url, c.created_at,
           (select count(*) from products p where p.company_id = c.id and p.status <> 'hidden') as product_count
    from companies c order by c.name`;
}

export async function getCompany(id: string) {
  const [c] = await db()`select id, name, logo_url, created_at from companies where id = ${id}`;
  return c ?? null;
}

export async function listBanners(includeInactive = false) {
  return db()`
    select id, title, image_url, redirect_url, display_order, is_active, created_at
    from homepage_banners
    ${includeInactive ? db()`` : db()`where is_active`}
    order by display_order, created_at`;
}
