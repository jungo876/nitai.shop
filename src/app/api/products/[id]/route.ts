import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const body = await request.json();
    const { name, category, description, image_url, company_id, is_top_selling, variants } = body;

    if (!name || !category || !description) {
      return NextResponse.json({ error: "Name, category, and description are required" }, { status: 400 });
    }

    // Update product
    const { error: updateError } = await supabase
      .from("products")
      .update({ name, category, description, image_url: image_url || "", company_id: company_id || null, is_top_selling: is_top_selling || false })
      .eq("id", id);

    if (updateError) {
      console.error("Product update error:", updateError);
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }

    // Delete old variants (cascade deletes bulk_prices)
    await supabase.from("product_variants").delete().eq("product_id", id);

    // Insert new variants + bulk prices
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        const { data: variant, error: vErr } = await supabase
          .from("product_variants")
          .insert([{
            product_id: id,
            label: v.label,
            unit_price: v.unit_price || 0,
            units_per_box: v.units_per_box || 1,
          }])
          .select()
          .single();

        if (vErr || !variant) continue;

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
            await supabase.from("bulk_prices").insert(bulkData);
          }
        }
      }
    }

    const { data: full } = await supabase
      .from("products")
      .select("*, companies(*), product_variants(*, bulk_prices(*))")
      .eq("id", id)
      .single();

    return NextResponse.json(full);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();

    // CASCADE handles variants + bulk_prices
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Product delete error:", error);
      return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
