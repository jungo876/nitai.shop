import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateBody } from "@/lib/validations";
import { z } from "zod";
import { requireAdmin, logAdminAction } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const updateProductSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
  category: z.string().trim().min(1, "Category is required").max(100),
  description: z.string().max(5000, "Description too long").default(""),
  image_url: z.string().url("Must be a valid URL").or(z.literal("")).default(""),
  company_id: z.string().uuid("Invalid company ID").nullable().optional(),
  is_top_selling: z.boolean().default(false),
  status: z.enum(["active", "out_of_stock", "coming_soon", "hidden"]).default("active"),
  home_category: z.string().trim().max(100).nullable().optional(),
  variants: z.array(z.object({
    label: z.string().trim().min(1, "Label is required").max(50),
    unit_price: z.number().nonnegative("Price must be non-negative").default(0),
    units_per_box: z.number().int().min(1, "Must be at least 1").default(1),
    bulk_prices: z.array(z.object({
      box_count: z.number().int().min(1),
      price_per_unit: z.number().positive("Price must be positive"),
      tag: z.string().max(30).optional().nullable(),
    })).optional().default([]),
  })).optional().default([]),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("products")
      .select("*, companies(*), product_variants(*, bulk_prices(*))")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Sort variants and bulk_prices
    const product = {
      ...data,
      product_variants: Array.isArray(data.product_variants)
        ? data.product_variants.map((v: Record<string, unknown>) => ({
            ...v,
            bulk_prices: Array.isArray(v.bulk_prices)
              ? [...(v.bulk_prices as { box_count: number }[])].sort((a, b) => a.box_count - b.box_count)
              : [],
          }))
        : [],
    };

    return NextResponse.json(product);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: admin, error: authErr } = await requireAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }
    const supabase = getSupabase();
    const body = await request.json();

    // Validate input
    const v = validateBody(updateProductSchema, body);
    if (v.error) return v.error;
    const { name, category, description, image_url, company_id, is_top_selling, status, home_category, variants } = v.data;

    // Update product
    const { data: updatedRows, error: updateError } = await supabase
      .from("products")
      .update({ name, category, description, image_url: image_url || "", company_id: company_id || null, is_top_selling: is_top_selling || false, status, home_category: home_category || null })
      .eq("id", id)
      .select();

    if (updateError) {
      console.error("Product update error:", updateError);
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }

    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json({ error: "Product update failed. This is usually caused by missing UPDATE policies in Supabase RLS for the products table." }, { status: 403 });
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
            .map((bp) => ({
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

    await logAdminAction(admin.id, "Product Updated", "Product", id, { name: full?.name || name });

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
    const { user: admin, error: authErr } = await requireAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }
    const supabase = getSupabase();

    // CASCADE handles variants + bulk_prices
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("Product delete error:", error);
      return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }

    await logAdminAction(admin.id, "Product Deleted", "Product", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
