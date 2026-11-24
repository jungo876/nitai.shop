import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const phone = cookieStore.get("nck_session")?.value;

  if (!phone) {
    return {
      user: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 }),
    };
  }

  const supabase = getSupabase();
  const { data: user } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("phone_number", phone)
    .single();

  if (!user || user.is_admin !== true) {
    return {
      user: null,
      error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 }),
    };
  }

  return { user, error: null };
}

export async function logAdminAction(adminUserId: string, action: string, entityType: string, entityId?: string | null, metadata?: any) {
  const supabase = getSupabase();
  const { error } = await supabase.from("admin_activity_logs").insert([{
    admin_user_id: adminUserId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    metadata: metadata || null,
  }]);
  
  if (error) {
    console.error("Failed to log admin action:", error);
  }
}
