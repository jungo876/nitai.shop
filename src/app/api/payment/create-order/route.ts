import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * POST /api/payment/create-order
 *
 * Creates a Razorpay order for the 25% advance amount.
 * Recalculates totals from DB — never trusts frontend.
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
      .select("id, name, phone_number, is_profile_complete")
      .eq("phone_number", phone)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.is_profile_complete) {
      return NextResponse.json({ error: "Profile incomplete" }, { status: 403 });
    }

    // 2. Get cart items and calculate server-side totals
    const { data: cartItems } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id);

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    let subtotal = 0;
    for (const item of cartItems) {
      const { data: variant } = await supabase
        .from("product_variants")
        .select("units_per_box, unit_price")
        .eq("id", item.variant_id)
        .single();

      let pricePerUnit = variant?.unit_price || 0;
      if (item.bulk_price_id) {
        const { data: bulkPrice } = await supabase
          .from("bulk_prices")
          .select("price_per_unit")
          .eq("id", item.bulk_price_id)
          .single();
        if (bulkPrice) pricePerUnit = bulkPrice.price_per_unit;
      }

      const unitsPerBox = variant?.units_per_box || 1;
      const totalUnits = item.box_count * unitsPerBox * item.quantity;
      subtotal += totalUnits * pricePerUnit;
    }

    const advanceAmount = Math.round(subtotal * 0.25);

    if (advanceAmount < 1) {
      return NextResponse.json({ error: "Order amount too small" }, { status: 400 });
    }

    // 3. Create Razorpay order (amount in paise)
    const razorpayOrder = await razorpay.orders.create({
      amount: advanceAmount * 100, // Convert to paise
      currency: "INR",
      receipt: `nck_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: user.id,
        phone: user.phone_number,
        subtotal: subtotal.toString(),
        advance: advanceAmount.toString(),
        type: "advance_payment",
      },
    });

    return NextResponse.json({
      order_id: razorpayOrder.id,
      amount: advanceAmount,
      amount_paise: advanceAmount * 100,
      currency: "INR",
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      user: {
        name: user.name,
        phone: user.phone_number,
      },
    });
  } catch (err) {
    console.error("Razorpay create-order error:", err);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
