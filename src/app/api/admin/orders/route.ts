import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";
import { rateLimit, orderLimiter } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validations";
import { updateOrderStatusSchema } from "@/lib/validations/order";
import { requireAdmin, logAdminAction } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

/** GET /api/admin/orders — fetch all orders with user/business/address */
export async function GET() {
  const blocked = await rateLimit(orderLimiter);
  if (blocked) return blocked;
  const { error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const supabase = getSupabase();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !orders) return NextResponse.json({ orders: [] });

  // Enrich with user + business + address + items
  const enriched = [];
  for (const o of orders) {
    const { data: user } = await supabase.from("users").select("name, phone_number, whatsapp_number").eq("id", o.user_id).single();
    const { data: bp } = await supabase.from("business_profiles").select("shop_name, gst_number, pan_number").eq("user_id", o.user_id).single();
    const { data: addr } = await supabase.from("addresses").select("address_line, landmark, city, state, pincode, phone_number").eq("user_id", o.user_id).eq("is_default", true).single();
    const { data: items } = await supabase.from("order_items").select("*").eq("order_id", o.id);

    enriched.push({
      ...o,
      customer_name: user?.name || "N/A",
      customer_phone: user?.phone_number || "",
      customer_whatsapp: user?.whatsapp_number || "",
      shop_name: bp?.shop_name || "",
      gst_number: bp?.gst_number || "",
      pan_number: bp?.pan_number || "",
      address: addr || null,
      items: items || [],
    });
  }

  return NextResponse.json({ orders: enriched });
}

/** PATCH /api/admin/orders — update order/payment status */
export async function PATCH(request: Request) {
  const blocked = await rateLimit(orderLimiter);
  if (blocked) return blocked;
  const { user: admin, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  const body = await request.json();

  // Validate input
  const v = validateBody(updateOrderStatusSchema, body);
  if (v.error) return v.error;
  const { order_id, order_status, payment_status } = v.data;

  const supabase = getSupabase();
  const updates: Record<string, string> = {};
  if (order_status) updates.order_status = order_status;
  if (payment_status) updates.payment_status = payment_status;

  const { error } = await supabase.from("orders").update(updates).eq("id", order_id);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  if (order_status) await logAdminAction(admin.id, "Order Status Changed", "Order", order_id, { new_status: order_status });
  if (payment_status) await logAdminAction(admin.id, "Payment Status Changed", "Order", order_id, { new_status: payment_status });

  return NextResponse.json({ success: true });
}
