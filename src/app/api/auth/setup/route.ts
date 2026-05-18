import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/setup
 * Body: { user_id, name, whatsapp_number, shop_name, gst_number, pan_number, business_type,
 *         address_line, landmark, city, state, pincode }
 * 
 * Creates business profile + address, marks user profile as complete.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id, name, whatsapp_number,
      shop_name, gst_number, pan_number, business_type,
      address_line, landmark, city, state, pincode,
    } = body;

    if (!user_id || !name || !shop_name) {
      return NextResponse.json({ error: "Name, user_id, and shop name are required" }, { status: 400 });
    }

    const supabase = getSupabase();

    // 1. Update user profile
    const { error: userError } = await supabase
      .from("users")
      .update({
        name,
        whatsapp_number: whatsapp_number || null,
        is_profile_complete: true,
      })
      .eq("id", user_id);

    if (userError) {
      console.error("User update error:", userError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // 2. Upsert business profile
    const { error: bizError } = await supabase
      .from("business_profiles")
      .upsert({
        user_id,
        shop_name,
        gst_number: gst_number || null,
        pan_number: pan_number || null,
        business_type: business_type || null,
      }, { onConflict: "user_id" });

    if (bizError) {
      console.error("Business profile error:", bizError);
      // Don't fail the whole request; profile is created
    }

    // 3. Upsert address (if provided)
    if (address_line && city && state && pincode) {
      const { error: addrError } = await supabase
        .from("addresses")
        .upsert({
          user_id,
          address_line,
          landmark: landmark || null,
          city,
          state,
          pincode,
          is_default: true,
        }, { onConflict: "user_id" });

      if (addrError) {
        console.error("Address error:", addrError);
      }
    }

    // 4. Return updated user
    const { data: updatedUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", user_id)
      .single();

    return NextResponse.json({ user: updatedUser });
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
