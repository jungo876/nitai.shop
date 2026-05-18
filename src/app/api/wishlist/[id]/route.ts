import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/wishlist/[id]
 * Removes a product from wishlist by product_id.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

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

    const { error } = await supabase
      .from("wishlist_items")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);

    if (error) {
      console.error("Wishlist DELETE error:", error);
      return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Wishlist DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
