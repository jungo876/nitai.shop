/**
 * Demo catalogue for local development and end-to-end tests.
 * Idempotent: re-running does not duplicate brands/products.
 * NEVER run against the production database (seed.mjs refuses unless --force).
 */
export async function seedDemoData(sql, { adminPhone } = {}) {
  const brands = ["Bayer CropScience", "Dhanuka Agritech", "UPL Limited"];
  const brandIds = {};
  for (const name of brands) {
    const [b] = await sql`
      insert into companies (name) values (${name})
      on conflict (name) do update set name = excluded.name
      returning id`;
    brandIds[name] = b.id;
  }

  const products = [
    {
      name: "Confidor Imidacloprid 17.8% SL", category: "Insecticide", home: "Crop Protection", brand: "Bayer CropScience", top: true,
      description: "Systemic insecticide for sucking pests on cotton, rice and vegetables.",
      variants: [
        { label: "100 ml", unit_price: 285, units_per_box: 40, tiers: [{ box_count: 5, price_per_unit: 265, tag: "Save 7%" }, { box_count: 10, price_per_unit: 250, tag: "Best price" }] },
        { label: "250 ml", unit_price: 640, units_per_box: 20, tiers: [] },
      ],
    },
    {
      name: "Nativo Fungicide 75 WG", category: "Fungicide", home: "Crop Protection", brand: "Bayer CropScience", top: true,
      description: "Broad-spectrum fungicide for blast and sheath blight in paddy.",
      variants: [{ label: "100 g", unit_price: 520, units_per_box: 50, tiers: [{ box_count: 3, price_per_unit: 495, tag: null }] }],
    },
    {
      name: "Targa Super Herbicide", category: "Herbicide", home: "Crop Protection", brand: "Dhanuka Agritech", top: false,
      description: "Post-emergence herbicide for grassy weeds in soybean and groundnut.",
      variants: [{ label: "250 ml", unit_price: 310.5, units_per_box: 40, tiers: [] }],
    },
    {
      name: "Saaf Fungicide", category: "Fungicide", home: "Crop Protection", brand: "UPL Limited", top: false, status: "out_of_stock",
      description: "Carbendazim + Mancozeb combination fungicide.",
      variants: [{ label: "500 g", unit_price: 395, units_per_box: 20, tiers: [] }],
    },
    {
      name: "Zinc Sulphate 33% Fertilizer", category: "Fertilizer", home: "Crop Nutrition", brand: "UPL Limited", top: true,
      description: "Corrects zinc deficiency; improves tillering and grain filling.",
      variants: [{ label: "5 kg", unit_price: 480, units_per_box: 4, tiers: [{ box_count: 10, price_per_unit: 450, tag: "Dealer price" }] }],
    },
  ];

  for (const p of products) {
    const [existing] = await sql`select id from products where name = ${p.name}`;
    if (existing) continue;
    const [row] = await sql`
      insert into products (name, category, home_category, description, company_id, is_top_selling, status)
      values (${p.name}, ${p.category}, ${p.home}, ${p.description}, ${brandIds[p.brand]}, ${p.top}, ${p.status ?? "active"})
      returning id`;
    for (const v of p.variants) {
      const [vr] = await sql`
        insert into product_variants (product_id, label, unit_price, units_per_box)
        values (${row.id}, ${v.label}, ${v.unit_price}, ${v.units_per_box}) returning id`;
      for (const t of v.tiers) {
        await sql`insert into bulk_prices (variant_id, box_count, price_per_unit, tag)
                  values (${vr.id}, ${t.box_count}, ${t.price_per_unit}, ${t.tag})`;
      }
    }
  }

  await sql`
    update store_settings set store_name = 'NCK Agro', whatsapp_number = coalesce(whatsapp_number, '9876543210'),
      support_email = coalesce(support_email, 'support@nitai.shop'),
      business_address = coalesce(business_address, 'Howrah, West Bengal')
    where id = 1`;

  if (adminPhone) {
    await sql`
      insert into users (phone_number, name, is_admin, is_profile_complete) values (${adminPhone}, 'Store Admin', true, false)
      on conflict (phone_number) do update set is_admin = true`;
  }
  return { brands: brands.length, products: products.length };
}
