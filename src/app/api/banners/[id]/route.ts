import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { requireAdmin, logAdminAction } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

/**
 * PUT /api/banners/[id]
 * Admin only: Update a banner.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authErr, user: adminUser } = await requireAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    const supabase = getSupabase();
    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title || null;
    if (body.image_url !== undefined) updates.image_url = body.image_url;
    if (body.redirect_url !== undefined) updates.redirect_url = body.redirect_url || null;
    if (body.display_order !== undefined) updates.display_order = body.display_order;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    const { data, error } = await supabase
      .from("homepage_banners")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("Banner update error:", error);
      return NextResponse.json({ error: "Failed to update banner" }, { status: 500 });
    }

    await logAdminAction(adminUser!.id, "update", "banner", id, updates);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Banner PUT error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/banners/[id]
 * Admin only: Delete a banner.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error: authErr, user: adminUser } = await requireAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from("homepage_banners")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Banner delete error:", error);
      return NextResponse.json({ error: "Failed to delete banner" }, { status: 500 });
    }

    await logAdminAction(adminUser!.id, "delete", "banner", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Banner DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
