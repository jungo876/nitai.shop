import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");
    const topSelling = searchParams.get("top_selling");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const supabase = getSupabase();
    let query = supabase
      .from("products")
      .select("*, companies(*), product_variants(*, bulk_prices(*))")
      .order("created_at", { ascending: false });

    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    if (topSelling === "true") {
      query = query.eq("is_top_selling", true);
    }
    
    if (limitParam && !isNaN(parseInt(limitParam, 10))) {
      const limit = parseInt(limitParam, 10);
      if (offsetParam && !isNaN(parseInt(offsetParam, 10))) {
        const offset = parseInt(offsetParam, 10);
        query = query.range(offset, offset + limit - 1);
      } else {
        query = query.limit(limit);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase GET error:", error);
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    // Sort variants and bulk_prices
    const products = (data || []).map((p: Record<string, unknown>) => ({
      ...p,
      product_variants: Array.isArray(p.product_variants)
        ? p.product_variants.map((v: Record<string, unknown>) => ({
            ...v,
            bulk_prices: Array.isArray(v.bulk_prices)
              ? [...v.bulk_prices].sort((a: { box_count: number }, b: { box_count: number }) => a.box_count - b.box_count)
              : [],
          }))
        : [],
    }));

    return NextResponse.json(products);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { name, category, description, image_url, company_id, is_top_selling, variants } = body;

    if (!name || !category || !description) {
      return NextResponse.json({ error: "Name, category, and description are required" }, { status: 400 });
    }

    // Insert product
    const { data: product, error } = await supabase
      .from("products")
      .insert([{ name, category, description, image_url: image_url || "", company_id: company_id || null, is_top_selling: is_top_selling || false }])
      .select()
      .single();

    if (error) {
      console.error("Supabase POST error:", error);
      return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }

    // Insert variants + bulk prices
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        const { data: variant, error: vErr } = await supabase
          .from("product_variants")
          .insert([{
            product_id: product.id,
            label: v.label,
            unit_price: v.unit_price || 0,
            units_per_box: v.units_per_box || 1,
          }])
          .select()
          .single();

        if (vErr || !variant) {
          console.error("Variant insert error:", vErr);
          continue;
        }

        if (v.bulk_prices && Array.isArray(v.bulk_prices) && v.bulk_prices.length > 0) {
          const bulkData = v.bulk_prices
            .filter((bp: { box_count: number; price_per_unit: number }) => bp.box_count && bp.price_per_unit)
            .map((bp: { box_count: number; price_per_unit: number; tag?: string }) => ({
              variant_id: variant.id,
              box_count: bp.box_count,
              price_per_unit: bp.price_per_unit,
              tag: bp.tag || null,
            }));

          if (bulkData.length > 0) {
            const { error: bErr } = await supabase.from("bulk_prices").insert(bulkData);
            if (bErr) console.error("Bulk insert error:", bErr);
          }
        }
      }
    }

    // Return full product
    const { data: full } = await supabase
      .from("products")
      .select("*, companies(*), product_variants(*, bulk_prices(*))")
      .eq("id", product.id)
      .single();

    return NextResponse.json(full || product, { status: 201 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
