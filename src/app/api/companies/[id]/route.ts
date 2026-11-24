import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { requireAdmin, logAdminAction } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Company GET error:", error);
      return NextResponse.json({ error: "Failed to fetch company" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: admin, error: authErr } = await requireAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    const supabase = getSupabase();
    const { name, logo_url } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("companies")
      .update({ name, logo_url: logo_url || "" })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Company update error:", error);
      return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
    }

    await logAdminAction(admin.id, "Company Updated", "Company", id, { name: data.name });

    return NextResponse.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: admin, error: authErr } = await requireAdmin();
    if (authErr) return authErr;

    const { id } = await params;
    const supabase = getSupabase();

    const { error } = await supabase.from("companies").delete().eq("id", id);

    if (error) {
      console.error("Company delete error:", error);
      return NextResponse.json({ error: "Failed to delete company" }, { status: 500 });
    }

    await logAdminAction(admin.id, "Company Deleted", "Company", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
