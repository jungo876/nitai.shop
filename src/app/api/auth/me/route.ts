import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const phone = cookieStore.get("nck_session")?.value;

    if (!phone) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const supabase = getSupabase();

    // 1. Get user
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", phone)
      .single();

    if (userError || !user) {
      return NextResponse.json({ user: null }, { status: 404 });
    }

    // 2. Get business profile
    const { data: businessProfile } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // 3. Get address
    const { data: address } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", user.id)
      .single(); // Assuming one address for now

    // Merge everything into a full profile object
    const fullProfile = {
      ...user,
      business_profile: businessProfile || null,
      address: address || null,
    };

    return NextResponse.json({ user: fullProfile });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
