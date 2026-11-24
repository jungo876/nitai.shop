import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { requireAdmin, logAdminAction } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // 1. Ensure user is admin
  const { user: admin, error: authErr } = await requireAdmin();
  if (authErr) return authErr;

  // 2. Ensure environment is development (Safety check)
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Dev tools are strictly disabled in production" },
      { status: 403 }
    );
  }

  try {
    const { action } = await request.json();
    const supabase = getSupabase();

    switch (action) {
      case "clear_orders":
        // Cascades to order_items
        await supabase.from("orders").delete().neq("id", "");
        await logAdminAction(admin.id, "Dev Tool", "Order", "ALL", { action: "clear_orders" });
        break;

      case "clear_cart":
        await supabase.from("cart_items").delete().neq("id", "");
        await logAdminAction(admin.id, "Dev Tool", "Cart", "ALL", { action: "clear_cart" });
        break;

      case "clear_wishlist":
        // If wishlist exists, clear it
        const { error } = await supabase.from("wishlists").delete().neq("id", "");
        if (!error) {
          await logAdminAction(admin.id, "Dev Tool", "Wishlist", "ALL", { action: "clear_wishlist" });
        }
        break;

      case "clear_payments":
        // We do not have a dedicated payments table, so we reset payment_status on orders
        await supabase
          .from("orders")
          .update({ payment_status: "pending", razorpay_order_id: null, razorpay_payment_id: null, razorpay_signature: null })
          .neq("id", "");
        await logAdminAction(admin.id, "Dev Tool", "Payment", "ALL", { action: "clear_payments" });
        break;

      case "reset_demo_data":
        // Wipe carts, wishlists, and orders
        await supabase.from("cart_items").delete().neq("id", "");
        await supabase.from("wishlists").delete().neq("id", "");
        await supabase.from("orders").delete().neq("id", "");
        await logAdminAction(admin.id, "Dev Tool", "System", "ALL", { action: "reset_demo_data" });
        break;

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Action ${action} completed.` });
  } catch (err) {
    console.error("Dev Reset Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
