import { NextResponse } from "next/server";
import { rateLimitLogin, recordFailedLogin, isLockedOut } from "@/lib/rate-limit";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "nckadmin123";

export async function POST(request: Request) {
  try {
    // Rate limit login attempts (IP-based for admin)
    const blocked = await rateLimitLogin("admin");
    if (blocked) return blocked;

    // Check if admin account is locked out
    const locked = await isLockedOut("admin-lockout");
    if (locked) return locked;

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (password !== ADMIN_PASSWORD) {
      // Record failed attempt — may trigger lockout
      const lockout = await recordFailedLogin("admin-lockout");
      if (lockout) return lockout;

      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
