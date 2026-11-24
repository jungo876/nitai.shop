import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/auth/admin";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { user: admin, error: authErr } = await requireAdmin();
    if (authErr) return authErr;

    const supabase = getSupabase();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, users(name, phone_number), business_profiles(shop_name)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch orders for export" }, { status: 500 });
    }

    // Usually, you might return the CSV data directly, or a URL to a generated file.
    // For now, we simply return the data so the frontend can convert it to CSV.
    await logAdminAction(admin.id, "CSV Export Generated", "Orders");

    return NextResponse.json({ success: true, orders });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
