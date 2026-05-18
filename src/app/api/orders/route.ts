import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders
 * Creates an order from the user's cart.
 *
 * Body:
 *   payment_method: "razorpay" | "cash_on_delivery"
 *   razorpay_order_id?: string  (only for razorpay)
 *   razorpay_payment_id?: string (only for razorpay)
 *
 * Flow:
 *   COD → creates order immediately (payment_status = "pending")
 *   Razorpay → creates order after payment (payment_status = "advance_paid")
 */
export async function POST(request: Request) {
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
      .select("id, is_profile_complete")
      .eq("phone_number", phone)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.is_profile_complete) {
      return NextResponse.json({ error: "Profile incomplete" }, { status: 403 });
    }

    const body = await request.json();
    const { payment_method, razorpay_order_id, razorpay_payment_id } = body;

    if (!payment_method || !["razorpay", "cash_on_delivery"].includes(payment_method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    // 2. Get cart items + calculate server-side totals
    const { data: cartItems } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id);

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    let subtotal = 0;
    const orderItemsData = [];

    for (const item of cartItems) {
      const { data: product } = await supabase
        .from("products")
        .select("name")
        .eq("id", item.product_id)
        .single();

      const { data: variant } = await supabase
        .from("product_variants")
        .select("label, units_per_box, unit_price")
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
      const totalPrice = totalUnits * pricePerUnit;
      subtotal += totalPrice;

      orderItemsData.push({
        product_id: item.product_id,
        variant_id: item.variant_id,
        bulk_price_id: item.bulk_price_id,
        product_name: product?.name || "Unknown",
        variant_label: variant?.label || "",
        box_count: item.box_count * item.quantity,
        units_per_box: unitsPerBox,
        price_per_unit: pricePerUnit,
        total_units: totalUnits,
        total_price: totalPrice,
      });
    }

    const advanceAmount = Math.round(subtotal * 0.25);
    const remainingAmount = subtotal - advanceAmount;

    // 3. Determine payment status
    const paymentStatus = payment_method === "razorpay" ? "advance_paid" : "pending";
    const orderStatus = "placed";

    // 4. Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: subtotal,
        advance_amount: advanceAmount,
        remaining_amount: remainingAmount,
        payment_status: paymentStatus,
        order_status: orderStatus,
        payment_method,
        razorpay_order_id: razorpay_order_id || null,
        razorpay_payment_id: razorpay_payment_id || null,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // 5. Insert order items
    const itemsWithOrderId = orderItemsData.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsWithOrderId);

    if (itemsError) {
      console.error("Order items error:", itemsError);
      // Still return the order — items can be retried
    }

    // 6. Clear cart
    await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      payment_status: paymentStatus,
      payment_method,
    }, { status: 201 });
  } catch (err) {
    console.error("Order creation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/orders
 * Returns user's order history.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;
    if (!phone) {
      return NextResponse.json({ orders: [] });
    }

    const supabase = getSupabase();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("phone_number", phone)
      .single();

    if (!user) {
      return NextResponse.json({ orders: [] });
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ orders: [] });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err) {
    console.error("Orders GET error:", err);
    return NextResponse.json({ orders: [] }, { status: 500 });
  }
}
