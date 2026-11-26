#!/usr/bin/env node
/**
 * Adds a starter catalogue of common agro-input products (generic technical
 * names, APPROXIMATE prices, no brand or photo) so the shop is not empty.
 * The owner edits prices, brands and photos in Admin → Products.
 *
 *   npm run samples:add     # adds any that are missing (safe to run again)
 *   npm run samples:hide    # hides all of them (status "hidden"); nothing is deleted
 *
 * Uses DATABASE_URL from .env.local.
 */
import nextEnv from "@next/env";
import postgres from "postgres";

nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const SAFETY = " Always read the label and leaflet for crop-wise dose and safety instructions before use.";
const v = (label, unit_price, units_per_box, tiers = []) => ({ label, unit_price, units_per_box, tiers });
const t = (box_count, price_per_unit, tag = null) => ({ box_count, price_per_unit, tag });

export const SAMPLES = [
  {
    name: "Imidacloprid 17.8% SL", category: "Insecticide", home: "Crop Protection", top: true,
    description: "Systemic insecticide for sucking pests such as aphids, jassids, thrips and whiteflies in cotton, paddy, chilli and vegetables. Moves through the plant for lasting protection.",
    variants: [v("100 ml", 160, 40, [t(5, 150, "Save 6%")]), v("250 ml", 370, 20)],
  },
  {
    name: "Chlorantraniliprole 18.5% SC", category: "Insecticide", home: "Crop Protection", top: true,
    description: "Insecticide for caterpillar pests: stem borer and leaf folder in paddy, fruit and shoot borers in vegetables, and early shoot borer in sugarcane. Gentle on beneficial insects.",
    variants: [v("60 ml", 820, 50, [t(3, 790, "Bulk price")]), v("150 ml", 1950, 20)],
  },
  {
    name: "Thiamethoxam 25% WG", category: "Insecticide", home: "Crop Protection", top: false,
    description: "Systemic insecticide for brown plant hopper (BPH) and other sucking pests in paddy, and for aphids, jassids and whiteflies in cotton and vegetables.",
    variants: [v("100 g", 290, 50, [t(5, 275)])],
  },
  {
    name: "Emamectin Benzoate 5% SG", category: "Insecticide", home: "Crop Protection", top: false,
    description: "Controls fruit borers, diamondback moth and other caterpillars in chilli, brinjal, okra, cabbage and cotton. Works by contact and stomach action.",
    variants: [v("100 g", 260, 50), v("250 g", 590, 20)],
  },
  {
    name: "Tricyclazole 75% WP", category: "Fungicide", home: "Crop Protection", top: false,
    description: "Systemic fungicide for blast disease (leaf and neck blast) in paddy. Best used as a preventive spray at the early sign of disease.",
    variants: [v("120 g", 210, 50, [t(5, 198, "Save 6%")])],
  },
  {
    name: "Hexaconazole 5% EC", category: "Fungicide", home: "Crop Protection", top: false,
    description: "Systemic fungicide for sheath blight in paddy and powdery mildew and leaf spots in many crops. Protective and curative action.",
    variants: [v("250 ml", 180, 40), v("1 litre", 620, 10)],
  },
  {
    name: "Mancozeb 75% WP", category: "Fungicide", home: "Crop Protection", top: true,
    description: "Broad-spectrum contact fungicide for late and early blight in potato and tomato, downy mildew in grapes and leaf spots in many crops. Low resistance risk.",
    variants: [v("500 g", 280, 20), v("1 kg", 530, 10, [t(5, 510)])],
  },
  {
    name: "Carbendazim 12% + Mancozeb 63% WP", category: "Fungicide", home: "Crop Protection", top: false,
    description: "Combination fungicide with systemic and contact action for leaf spot, blast and anthracnose in paddy, groundnut, chilli and other crops.",
    variants: [v("250 g", 190, 40), v("500 g", 360, 20)],
  },
  {
    name: "Pretilachlor 50% EC", category: "Herbicide", home: "Crop Protection", top: false,
    description: "Pre-emergence herbicide for transplanted paddy. Controls grassy weeds, sedges and some broad-leaf weeds when applied within a few days of transplanting.",
    variants: [v("500 ml", 310, 20), v("1 litre", 590, 10)],
  },
  {
    name: "2,4-D Amine Salt 58% SL", category: "Herbicide", home: "Crop Protection", top: false,
    description: "Selective post-emergence herbicide for broad-leaf weeds and sedges in wheat, paddy, maize and sugarcane.",
    variants: [v("500 ml", 240, 20)],
  },
  {
    name: "Zinc Sulphate Monohydrate 33%", category: "Fertilizer", home: "Crop Nutrition", top: true,
    description: "Zinc fertiliser that corrects zinc deficiency (khaira disease in paddy) and improves tillering, grain filling and yield in paddy, wheat, maize and vegetables.",
    variants: [v("1 kg", 95, 25, [t(4, 88, "Dealer price")]), v("5 kg", 430, 4)],
  },
  {
    name: "NPK 19:19:19 Water Soluble Fertilizer", category: "Fertilizer", home: "Crop Nutrition", top: false,
    description: "Fully water-soluble balanced fertiliser with equal nitrogen, phosphorus and potash for foliar spray and drip irrigation during early crop growth.",
    variants: [v("1 kg", 150, 25), v("25 kg bag", 3400, 1)],
  },
  {
    name: "Gibberellic Acid 0.001% L", category: "Plant Growth Regulator", home: "Crop Nutrition", top: false,
    description: "Plant growth regulator that improves flowering, fruit set and fruit size in vegetables, fruits and paddy when sprayed at the right stage.",
    variants: [v("250 ml", 160, 40), v("1 litre", 540, 10)],
  },
].map((p) => ({ ...p, description: p.description + SAFETY }));

async function main() {
  const mode = process.argv[2];
  if (!["add", "hide"].includes(mode)) {
    console.error("Usage: node scripts/sample-products.mjs add | hide");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (.env.local).");
    process.exit(1);
  }
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
  try {
    if (mode === "hide") {
      const rows = await sql`update products set status = 'hidden' where name = any(${SAMPLES.map((p) => p.name)}::text[]) returning name`;
      console.log(`Hid ${rows.length} sample product(s). Nothing was deleted.`);
      return;
    }
    let added = 0;
    await sql.begin(async (tx) => {
      for (const p of SAMPLES) {
        const [exists] = await tx`select id from products where name = ${p.name}`;
        if (exists) continue;
        const [row] = await tx`
          insert into products (name, category, home_category, description, is_top_selling, status)
          values (${p.name}, ${p.category}, ${p.home}, ${p.description}, ${p.top}, 'active') returning id`;
        for (const variant of p.variants) {
          const [vr] = await tx`
            insert into product_variants (product_id, label, unit_price, units_per_box)
            values (${row.id}, ${variant.label}, ${variant.unit_price}, ${variant.units_per_box}) returning id`;
          for (const tier of variant.tiers) {
            await tx`insert into bulk_prices (variant_id, box_count, price_per_unit, tag)
                     values (${vr.id}, ${tier.box_count}, ${tier.price_per_unit}, ${tier.tag})`;
          }
        }
        added++;
        console.log(`  + ${p.name}`);
      }
    });
    console.log(`Added ${added} sample product(s); ${SAMPLES.length - added} already existed.`);
    console.log("Prices are APPROXIMATE — update them (and add brand + photo) in Admin → Products.");
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/").replace(/^\//, "")}` || process.argv[1]?.endsWith("sample-products.mjs")) {
  main().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
