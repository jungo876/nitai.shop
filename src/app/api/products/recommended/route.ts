import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "productId is required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Fetch the current product to get its category and company_id
    const { data: currentProduct, error: productError } = await supabase
      .from("products")
      .select("id, category, company_id")
      .eq("id", productId)
      .single();

    if (productError || !currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { category, company_id } = currentProduct;

    // 2. Fetch same-category products (excluding current), limit 6
    const { data: categoryProducts } = await supabase
      .from("products")
      .select("*, companies(*), product_variants(*, bulk_prices(*))")
      .eq("category", category)
      .neq("id", productId)
      .order("created_at", { ascending: false })
      .limit(6);

    const results: Record<string, unknown>[] = categoryProducts || [];

    // 3. If we have fewer than 6, fill with same-company products
    if (results.length < 6 && company_id) {
      const existingIds = [productId, ...results.map((p) => p.id)];

      const { data: companyProducts } = await supabase
        .from("products")
        .select("*, companies(*), product_variants(*, bulk_prices(*))")
        .eq("company_id", company_id)
        .not("id", "in", `(${existingIds.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(6 - results.length);

      if (companyProducts) {
        results.push(...companyProducts);
      }
    }

    // 4. Sort variants and bulk_prices for each product
    const cleaned = results.map((p) => ({
      ...p,
      product_variants: Array.isArray(p.product_variants)
        ? (p.product_variants as Record<string, unknown>[]).map((v) => ({
            ...v,
            bulk_prices: Array.isArray(v.bulk_prices)
              ? [...(v.bulk_prices as { box_count: number }[])].sort((a, b) => a.box_count - b.box_count)
              : [],
          }))
        : [],
    }));

    return NextResponse.json(cleaned);
  } catch (err) {
    console.error("Recommendations error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
