import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/summary
 *
 * Recalculates totals on the server from the user's cart.
 * NEVER trusts frontend math.
 *
 * Returns:
 *  - items (with server-validated pricing)
 *  - subtotal
 *  - advance_amount (25%)
 *  - remaining_amount (75%)
 *  - user profile / address / business data
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;
    if (!phone) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const supabase = getSupabase();

    // 1. Get user
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", phone)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Validate profile is complete
    if (!user.is_profile_complete) {
      return NextResponse.json({ error: "Profile incomplete", redirect: "/account/setup" }, { status: 403 });
    }

    // 3. Get business profile
    const { data: businessProfile } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // 4. Get address
    const { data: address } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .single();

    // 5. Get cart items
    const { data: cartItems, error: cartError } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (cartError || !cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty", redirect: "/cart" }, { status: 400 });
    }

    // 6. Server-side price calculation — NEVER trust frontend
    let subtotal = 0;
    const validatedItems = [];

    for (const item of cartItems) {
      // Get product
      const { data: product } = await supabase
        .from("products")
        .select("name, image_url")
        .eq("id", item.product_id)
        .single();

      // Get variant
      const { data: variant } = await supabase
        .from("product_variants")
        .select("label, units_per_box, unit_price")
        .eq("id", item.variant_id)
        .single();

      // Get bulk price (if selected)
      let pricePerUnit = variant?.unit_price || 0;
      if (item.bulk_price_id) {
        const { data: bulkPrice } = await supabase
          .from("bulk_prices")
          .select("price_per_unit")
          .eq("id", item.bulk_price_id)
          .single();
        if (bulkPrice) {
          pricePerUnit = bulkPrice.price_per_unit;
        }
      }

      const unitsPerBox = variant?.units_per_box || 1;
      const totalUnits = item.box_count * unitsPerBox * item.quantity;
      const totalPrice = totalUnits * pricePerUnit;

      subtotal += totalPrice;

      validatedItems.push({
        cart_item_id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        bulk_price_id: item.bulk_price_id,
        product_name: product?.name || "Unknown Product",
        product_image: product?.image_url || "",
        variant_label: variant?.label || "",
        box_count: item.box_count,
        quantity: item.quantity,
        units_per_box: unitsPerBox,
        price_per_unit: pricePerUnit,
        total_units: totalUnits,
        total_price: totalPrice,
      });
    }

    const advanceAmount = Math.round(subtotal * 0.25);
    const remainingAmount = subtotal - advanceAmount;

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        whatsapp_number: user.whatsapp_number,
      },
      business_profile: businessProfile || null,
      address: address || null,
      items: validatedItems,
      subtotal,
      advance_amount: advanceAmount,
      remaining_amount: remainingAmount,
      item_count: validatedItems.reduce((sum, i) => sum + i.quantity, 0),
    });
  } catch (err) {
    console.error("Checkout summary error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
