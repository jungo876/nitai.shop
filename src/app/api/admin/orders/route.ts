import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "nckadmin123";

async function isAdmin() {
  const c = await cookies();
  return c.get("nck_admin")?.value === ADMIN_PASSWORD;
}

/** GET /api/admin/orders — fetch all orders with user/business/address */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { order_id, order_status, payment_status } = await request.json();
  if (!order_id) return NextResponse.json({ error: "order_id required" }, { status: 400 });

  const supabase = getSupabase();
  const updates: Record<string, string> = {};
  if (order_status) updates.order_status = order_status;
  if (payment_status) updates.payment_status = payment_status;

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { error } = await supabase.from("orders").update(updates).eq("id", order_id);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  return NextResponse.json({ success: true });
}
