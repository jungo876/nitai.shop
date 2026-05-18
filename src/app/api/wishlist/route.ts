import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/wishlist
 * Returns the logged-in user's wishlist product IDs (for quick lookup)
 * and enriched product data for the wishlist page.
 */
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;
    if (!phone) {
      return NextResponse.json({ items: [], product_ids: [] });
    }

    const supabase = getSupabase();

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone)
      .single();

    if (!user) {
      return NextResponse.json({ items: [], product_ids: [] });
    }

    const { data: wishlistItems, error } = await supabase
      .from("wishlist_items")
      .select("id, product_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !wishlistItems) {
      return NextResponse.json({ items: [], product_ids: [] });
    }

    const url = new URL(request.url);
    const idsOnly = url.searchParams.get("ids_only") === "true";

    // Fast path: just return product IDs for heart icon state
    if (idsOnly) {
      return NextResponse.json({
        product_ids: wishlistItems.map((w) => w.product_id),
      });
    }

    // Full path: enrich with product data
    const enriched = [];
    for (const item of wishlistItems) {
      const { data: product } = await supabase
        .from("products")
        .select("id, name, image_url, category")
        .eq("id", item.product_id)
        .single();

      if (!product) continue;

      // Get cheapest variant for price preview
      const { data: variants } = await supabase
        .from("product_variants")
        .select("label, unit_price, units_per_box")
        .eq("product_id", item.product_id)
        .order("unit_price", { ascending: true })
        .limit(1);

      const variant = variants?.[0] || null;

      enriched.push({
        wishlist_id: item.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url || "",
        category: product.category,
        variant_label: variant?.label || "",
        unit_price: variant?.unit_price || 0,
        created_at: item.created_at,
      });
    }

    return NextResponse.json({
      items: enriched,
      product_ids: wishlistItems.map((w) => w.product_id),
    });
  } catch (err) {
    console.error("Wishlist GET error:", err);
    return NextResponse.json({ items: [], product_ids: [] }, { status: 500 });
  }
}

/**
 * POST /api/wishlist
 * Body: { product_id }
 * Adds a product to the user's wishlist.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;
    if (!phone) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const supabase = getSupabase();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { product_id } = await request.json();
    if (!product_id) {
      return NextResponse.json({ error: "product_id required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("wishlist_items")
      .upsert({ user_id: user.id, product_id }, { onConflict: "user_id,product_id" });

    if (error) {
      console.error("Wishlist POST error:", error);
      return NextResponse.json({ error: "Failed to add" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Wishlist POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
