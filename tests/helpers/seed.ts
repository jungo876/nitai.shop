import type { Sql } from "@/server/db";

/** Creates a brand with one product: variant A (with two bulk tiers) and variant B. */
export async function seedCatalog(sql: Sql, opts: { status?: string; unitPrice?: number } = {}) {
  const [company] = await sql`insert into companies (name) values (${"Brand " + Math.random().toString(36).slice(2, 8)}) returning id`;
  const [product] = await sql`
    insert into products (name, category, home_category, description, company_id, status)
    values ('Knockdown 1L', 'Insecticide', 'Crop Protection', 'Test product', ${company.id}, ${opts.status ?? "active"})
    returning id`;
  const [vA] = await sql`insert into product_variants (product_id, label, unit_price, units_per_box)
                         values (${product.id}, '1 L', ${opts.unitPrice ?? 500}, 10) returning id`;
  const [vB] = await sql`insert into product_variants (product_id, label, unit_price, units_per_box)
                         values (${product.id}, '500 ml', 260, 20) returning id`;
  const [t5] = await sql`insert into bulk_prices (variant_id, box_count, price_per_unit, tag) values (${vA.id}, 5, 450, 'Save 10%') returning id`;
  const [t10] = await sql`insert into bulk_prices (variant_id, box_count, price_per_unit) values (${vA.id}, 10, 425) returning id`;
  return { companyId: company.id as string, productId: product.id as string, variantA: vA.id as string, variantB: vB.id as string, tier5: t5.id as string, tier10: t10.id as string };
}

export const COMPLETE_PROFILE = {
  name: "Suresh Das",
  shop_name: "Das Krishi Kendra",
  business_type: "retailer",
  gst_number: "19ABCDE1234F1Z5",
  address_line: "Station Road, Uluberia",
  city: "Howrah",
  state: "West Bengal",
  pincode: "711316",
};
