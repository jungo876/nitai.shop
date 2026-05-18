import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[id]
 * Returns full order details including items.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

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

    // Get order (verify ownership)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get order items
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      order,
      items: items || [],
    });
  } catch (err) {
    console.error("Order detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
