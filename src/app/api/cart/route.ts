import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { rateLimit, orderLimiter } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validations";
import { addToCartSchema } from "@/lib/validations/cart";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * GET /api/cart
 * Returns the current user's cart items enriched with product data.
 */
export async function GET() {
  try {
    const blocked = await rateLimit(orderLimiter);
    if (blocked) return blocked;

    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;
    if (!phone) {
      return NextResponse.json({ items: [], count: 0 });
    }

    const supabase = getSupabase();

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone)
      .single();

    if (!user) {
      return NextResponse.json({ items: [], count: 0 });
    }

    // Get cart items
    const { data: cartItems, error } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !cartItems) {
      return NextResponse.json({ items: [], count: 0 });
    }

    // Enrich each cart item with product data
    const enriched = [];
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

      enriched.push({
        ...item,
        product_name: product?.name || "Unknown Product",
        product_image: product?.image_url || "",
        variant_label: variant?.label || "",
        units_per_box: unitsPerBox,
        price_per_unit: pricePerUnit,
        total_units: totalUnits,
        total_price: totalPrice,
      });
    }

    const count = enriched.reduce((sum, item) => sum + item.quantity, 0);
    return NextResponse.json({ items: enriched, count });
  } catch (err) {
    console.error("Cart GET error:", err);
    return NextResponse.json({ items: [], count: 0 }, { status: 500 });
  }
}

/**
 * POST /api/cart
 * Body: { product_id, variant_id, bulk_price_id, box_count }
 * Adds an item to cart. If same combo exists, increments quantity.
 */
export async function POST(request: Request) {
  try {
    const blocked = await rateLimit(orderLimiter);
    if (blocked) return blocked;

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

    const body = await request.json();

    // Validate input
    const v = validateBody(addToCartSchema, body);
    if (v.error) return v.error;
    const { product_id, variant_id, bulk_price_id, box_count } = v.data;

    // Check for existing duplicate
    let query = supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .eq("variant_id", variant_id);

    if (bulk_price_id) {
      query = query.eq("bulk_price_id", bulk_price_id);
    } else {
      query = query.is("bulk_price_id", null);
    }

    const { data: existing } = await query.single();

    if (existing) {
      // Increment quantity
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + 1 })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Cart update error:", updateError);
        return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
      }
      return NextResponse.json({ success: true, action: "incremented" });
    }

    // Insert new item
    const { error: insertError } = await supabase
      .from("cart_items")
      .insert({
        user_id: user.id,
        product_id,
        variant_id,
        bulk_price_id: bulk_price_id || null,
        box_count,
        quantity: 1,
      });

    if (insertError) {
      console.error("Cart insert error:", insertError);
      return NextResponse.json({ error: "Failed to add to cart" }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: "added" }, { status: 201 });
  } catch (err) {
    console.error("Cart POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/cart
 * Body: { item_id, quantity }
 * Updates quantity for a cart item.
 */
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;
    if (!phone) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const schema = z.object({
      item_id: z.string().uuid("Invalid item ID"),
      quantity: z.number().int().min(1, "Minimum quantity is 1"),
    });
    const v = validateBody(schema, body);
    if (v.error) return v.error;
    const { item_id, quantity } = v.data;

    const supabase = getSupabase();

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", item_id);

    if (error) {
      console.error("Cart PATCH error:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cart PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/cart
 * Body: { item_id }
 * Removes an item from cart.
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;
    if (!phone) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    const schema = z.object({ item_id: z.string().uuid("Invalid item ID") });
    const v = validateBody(schema, body);
    if (v.error) return v.error;
    const { item_id } = v.data;

    const supabase = getSupabase();

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", item_id);

    if (error) {
      console.error("Cart DELETE error:", error);
      return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cart DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
