import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { requireAdmin, logAdminAction } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/banners
 * Public: Returns active banners sorted by display_order.
 * If ?all=true (admin), returns ALL banners.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get("all") === "true";

    const supabase = getSupabase();
    let query = supabase
      .from("homepage_banners")
      .select("*")
      .order("display_order", { ascending: true });

    if (!all) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Banners fetch error:", error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Banners GET error:", err);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/banners
 * Admin only: Create a new banner.
 */
export async function POST(request: Request) {
  try {
    const { error: authErr, user: adminUser } = await requireAdmin();
    if (authErr) return authErr;

    const supabase = getSupabase();
    const body = await request.json();

    const { title, image_url, redirect_url, display_order, is_active } = body;

    if (!image_url) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("homepage_banners")
      .insert({
        title: title || null,
        image_url,
        redirect_url: redirect_url || null,
        display_order: display_order ?? 0,
        is_active: is_active ?? true,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Banner create error:", error);
      return NextResponse.json({ error: "Failed to create banner" }, { status: 500 });
    }

    await logAdminAction(adminUser!.id, "create", "banner", data.id, { title, image_url });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Banner POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
