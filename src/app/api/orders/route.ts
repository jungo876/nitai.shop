import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { rateLimit, orderLimiter } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validations";
import { createOrderSchema } from "@/lib/validations/order";

export const dynamic = "force-dynamic";

/**
 * POST /api/orders
 * Creates an order from the user's cart after Razorpay payment.
 *
 * payment_method = "prepaid" → 100% paid, payment_status = "paid"
 * payment_method = "cod"     → 10% advance, payment_status = "advance_paid"
 */
export async function POST(request: Request) {
  try {
    console.log("[ORDER] ── Step 0: Rate limit check");
    const blocked = await rateLimit(orderLimiter);
    if (blocked) return blocked;

    console.log("[ORDER] ── Step 1: Session lookup");
    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;
    if (!phone) {
      console.log("[ORDER] ✗ No session cookie");
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }
    console.log("[ORDER] ✓ Session phone:", phone);

    const supabase = getSupabase();

    console.log("[ORDER] ── Step 2: User lookup");
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, is_profile_complete")
      .eq("phone_number", phone)
      .single();

    if (userError) {
      console.error("[ORDER] ✗ User lookup error:", JSON.stringify(userError));
      return NextResponse.json({ error: "User lookup failed", detail: userError.message }, { status: 500 });
    }
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.is_profile_complete) return NextResponse.json({ error: "Profile incomplete" }, { status: 403 });
    console.log("[ORDER] ✓ User found:", user.id, "profile_complete:", user.is_profile_complete);

    console.log("[ORDER] ── Step 3: Parse & validate body");
    const body = await request.json();
    console.log("[ORDER] Body received:", JSON.stringify(body));

    const v = validateBody(createOrderSchema, body);
    if (v.error) {
      console.log("[ORDER] ✗ Validation failed");
      return v.error;
    }
    const { razorpay_order_id, razorpay_payment_id, payment_method: payMethod } = v.data;
    console.log("[ORDER] ✓ Validated — rp_order:", razorpay_order_id, "rp_pay:", razorpay_payment_id, "method:", payMethod);

    console.log("[ORDER] ── Step 4: Fetch cart items");
    const { data: cartItems, error: cartError } = await supabase
      .from("cart_items")
      .select("*")
      .eq("user_id", user.id);

    if (cartError) {
      console.error("[ORDER] ✗ Cart fetch error:", JSON.stringify(cartError));
      return NextResponse.json({ error: "Failed to fetch cart", detail: cartError.message }, { status: 500 });
    }
    if (!cartItems || cartItems.length === 0) {
      console.log("[ORDER] ✗ Cart is empty for user", user.id);
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }
    console.log("[ORDER] ✓ Cart items:", cartItems.length);

    console.log("[ORDER] ── Step 5: Calculate totals");
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of cartItems) {
      const { data: product } = await supabase.from("products").select("name").eq("id", item.product_id).single();
      const { data: variant } = await supabase.from("product_variants").select("label, units_per_box, unit_price").eq("id", item.variant_id).single();

      let pricePerUnit = variant?.unit_price || 0;
      if (item.bulk_price_id) {
        const { data: bulkPrice } = await supabase.from("bulk_prices").select("price_per_unit").eq("id", item.bulk_price_id).single();
        if (bulkPrice) pricePerUnit = bulkPrice.price_per_unit;
      }

      const unitsPerBox = variant?.units_per_box || 1;
      const totalUnits = item.box_count * unitsPerBox * item.quantity;
      const totalPrice = totalUnits * pricePerUnit;
      subtotal += totalPrice;

      orderItemsData.push({
        product_id: item.product_id, variant_id: item.variant_id, bulk_price_id: item.bulk_price_id || null,
        product_name: product?.name || "Unknown", variant_label: variant?.label || "",
        box_count: item.box_count * item.quantity, units_per_box: unitsPerBox,
        price_per_unit: pricePerUnit, total_units: totalUnits, total_price: totalPrice,
      });
    }
    console.log("[ORDER] ✓ Subtotal:", subtotal, "Items computed:", orderItemsData.length);

    // Calculate based on payment method
    const isPrepaid = payMethod === "prepaid";
    const paidAmount = isPrepaid ? subtotal : Math.round(subtotal * 0.10);
    const remainingAmount = subtotal - paidAmount;
    const paymentStatus = isPrepaid ? "paid" : "advance_paid";
    const paymentType = isPrepaid ? "full" : "advance";

    console.log("[ORDER] ✓ Method:", payMethod, "Paid:", paidAmount, "Remaining:", remainingAmount, "Status:", paymentStatus);

    console.log("[ORDER] ── Step 6: Insert order row");
    const orderPayload = {
      user_id: user.id,
      total_amount: subtotal,
      advance_amount: paidAmount,
      remaining_amount: remainingAmount,
      payment_status: paymentStatus,
      order_status: "placed",
      payment_method: payMethod,
      remaining_payment_method: isPrepaid ? null : "cash_on_delivery",
      razorpay_order_id,
      razorpay_payment_id,
    };
    console.log("[ORDER] Insert payload:", JSON.stringify(orderPayload));

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[ORDER] ✗ ORDER INSERT FAILED:", JSON.stringify(orderError));
      console.error("[ORDER] ✗ Error message:", orderError?.message);
      console.error("[ORDER] ✗ Error details:", orderError?.details);
      console.error("[ORDER] ✗ Error hint:", orderError?.hint);
      console.error("[ORDER] ✗ Error code:", orderError?.code);
      return NextResponse.json({
        error: "Failed to create order",
        detail: orderError?.message || "Unknown DB error",
        code: orderError?.code,
        hint: orderError?.hint,
      }, { status: 500 });
    }
    console.log("[ORDER] ✓ Order created:", order.id);

    console.log("[ORDER] ── Step 7: Insert order items");
    const itemsPayload = orderItemsData.map((item) => ({ ...item, order_id: order.id }));
    console.log("[ORDER] Items payload sample:", JSON.stringify(itemsPayload[0]));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsPayload);

    if (itemsError) {
      console.error("[ORDER] ✗ ORDER ITEMS INSERT FAILED:", JSON.stringify(itemsError));
      console.error("[ORDER] ✗ Items error message:", itemsError.message);
      console.error("[ORDER] ✗ Items error code:", itemsError.code);
      return NextResponse.json({
        error: "Order created but items failed to save",
        order_id: order.id,
        detail: itemsError.message,
      }, { status: 500 });
    }
    console.log("[ORDER] ✓ Order items inserted");

    console.log("[ORDER] ── Step 8: Clear cart");
    const { error: clearError } = await supabase.from("cart_items").delete().eq("user_id", user.id);
    if (clearError) {
      console.error("[ORDER] ⚠ Cart clear failed (non-fatal):", JSON.stringify(clearError));
    } else {
      console.log("[ORDER] ✓ Cart cleared");
    }

    console.log("[ORDER] ══ SUCCESS ══ Order:", order.id);
    return NextResponse.json({
      success: true,
      order_id: order.id,
      payment_status: paymentStatus,
      payment_method: payMethod,
      payment_type: paymentType,
      paid_amount: paidAmount,
      remaining_amount: remainingAmount,
    }, { status: 201 });
  } catch (err: any) {
    console.error("[ORDER] ✗✗ UNCAUGHT EXCEPTION:", err?.message || err);
    console.error("[ORDER] ✗✗ Stack:", err?.stack);
    return NextResponse.json({
      error: "Internal server error",
      detail: err?.message || "Unknown error",
    }, { status: 500 });
  }
}

/**
 * GET /api/orders
 * Returns user's order history.
 */
export async function GET() {
  try {
    const blocked = await rateLimit(orderLimiter);
    if (blocked) return blocked;

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
