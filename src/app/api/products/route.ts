import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateBody } from "@/lib/validations";
import { z } from "zod";
import { requireAdmin, logAdminAction } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("company_id");
    const topSelling = searchParams.get("top_selling");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const homeCategory = searchParams.get("home_category");
    const includeHidden = searchParams.get("include_hidden");

    const supabase = getSupabase();
    let query = supabase
      .from("products")
      .select("*, companies(*), product_variants(*, bulk_prices(*))")
      .order("created_at", { ascending: false });

    if (companyId) {
      // Validate company_id is UUID before using in query
      if (!z.string().uuid().safeParse(companyId).success) {
        return NextResponse.json({ error: "Invalid company_id" }, { status: 400 });
      }
      query = query.eq("company_id", companyId);
    }
    if (topSelling === "true") {
      query = query.eq("is_top_selling", true);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (homeCategory) {
      query = query.eq("home_category", homeCategory);
    }
    if (search) {
      // Find matching companies first to support OR company.name ILIKE %search%
      const { data: compData } = await supabase.from("companies").select("id").ilike("name", `%${search}%`);
      const compIds = compData?.map(c => c.id) || [];
      
      const compFilter = compIds.length > 0 ? `,company_id.in.(${compIds.join(",")})` : "";
      query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%${compFilter}`);
    }
    
    if (includeHidden !== "true") {
      query = query.neq("status", "hidden");
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

const createProductSchema = z.object({
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

export async function POST(request: Request) {
  try {
    const { user: admin, error: authErr } = await requireAdmin();
    if (authErr) return authErr;

    const supabase = getSupabase();
    const body = await request.json();

    // Validate input
    const v = validateBody(createProductSchema, body);
    if (v.error) return v.error;
    const { name, category, description, image_url, company_id, is_top_selling, status, home_category, variants } = v.data;

    // Insert product
    const { data: product, error } = await supabase
      .from("products")
      .insert([{ name, category, description, image_url: image_url || "", company_id: company_id || null, is_top_selling: is_top_selling || false, status, home_category: home_category || null }])
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
            .map((bp) => ({
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

    await logAdminAction(admin.id, "Product Created", "Product", product.id, { name: product.name });

    return NextResponse.json(full || product, { status: 201 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
