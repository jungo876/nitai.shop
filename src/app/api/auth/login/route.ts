import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/login
 * Body: { phone_number: string }
 * 
 * Finds or creates a user by phone number.
 * Returns the user object (with is_profile_complete flag).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone_number } = body;

    if (!phone_number || typeof phone_number !== "string" || phone_number.trim().length < 10) {
      return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
    }

    const cleanPhone = phone_number.replace(/\D/g, "").slice(-10); // normalize to last 10 digits
    const supabase = getSupabase();

    // 1. Try to find existing user
    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", cleanPhone)
      .single();

    if (existing) {
      const response = NextResponse.json({ user: existing });
      response.cookies.set("nck_session", cleanPhone, {
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }

    // 2. Create new user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert([{
        phone_number: cleanPhone,
        is_profile_complete: false,
      }])
      .select()
      .single();

    if (createError) {
      console.error("User creation error:", createError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const response = NextResponse.json({ user: newUser, isNew: true }, { status: 201 });
    response.cookies.set("nck_session", cleanPhone, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (err) {
    console.error("Auth login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
