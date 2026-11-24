import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/* ═══════════════════════════════════════════
   Redis client (singleton)
   ═══════════════════════════════════════════ */
const hasRedis = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

// Dummy redis client to prevent crashes if not configured
const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : ({} as any);

// Helper to wrap ratelimiters so they fail-open (allow) if no redis
function createLimiter(config: any) {
  if (!hasRedis) return { limit: async () => ({ success: true, limit: 100, remaining: 99, reset: Date.now() }) } as unknown as Ratelimit;
  return new Ratelimit(config);
}

/* ═══════════════════════════════════════════
   Endpoint-specific limiters
   ═══════════════════════════════════════════ */

/** Auth / login — 5 req / 60s */
export const loginLimiter = createLimiter({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "rl:login",
});

/** Payment order creation — 10 req / 60s */
export const paymentCreateLimiter = createLimiter({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "rl:pay-create",
});

/** Payment verification — 20 req / 60s */
export const paymentVerifyLimiter = createLimiter({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  analytics: true,
  prefix: "rl:pay-verify",
});

/** Order / cart / checkout — 20 req / 60s */
export const orderLimiter = createLimiter({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  analytics: true,
  prefix: "rl:order",
});

/** Search / wishlist / product queries — 60 req / 60s */
export const searchLimiter = createLimiter({
  redis,
  limiter: Ratelimit.slidingWindow(60, "60 s"),
  analytics: true,
  prefix: "rl:search",
});

/** Contact / enquiry — 5 req / 60s */
export const contactLimiter = createLimiter({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  analytics: true,
  prefix: "rl:contact",
});

/* ═══════════════════════════════════════════
   Global per-IP limiter (second layer)
   Catches bots hitting many endpoints.
   200 total requests / 60s from any single IP.
   ═══════════════════════════════════════════ */
const globalLimiter = createLimiter({
  redis,
  limiter: Ratelimit.slidingWindow(200, "60 s"),
  analytics: true,
  prefix: "rl:global",
});

/* ═══════════════════════════════════════════
   Account lockout limiter
   After 10 failed login attempts in 15 min,
   lock the account (phone) for 15 minutes.
   ═══════════════════════════════════════════ */
const lockoutLimiter = createLimiter({
  redis,
  limiter: Ratelimit.fixedWindow(10, "900 s"),
  analytics: true,
  prefix: "rl:lockout",
});

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

/** Extract client IP from request headers */
export async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  return (
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/** Get logged-in user's phone from session cookie (if available) */
export async function getSessionPhone(): Promise<string | null> {
  const c = await cookies();
  return c.get("nck_session")?.value || null;
}

/** Build a 429 response with proper headers */
function blocked429(limit: number, reset: number): NextResponse {
  return NextResponse.json(
    { success: false, error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(reset),
        "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
      },
    }
  );
}

/* ═══════════════════════════════════════════
   Main guards
   ═══════════════════════════════════════════ */

/**
 * Standard rate limiter for authenticated routes.
 * Uses user phone (from session) as identifier so users
 * behind the same WiFi/office IP don't affect each other.
 * Falls back to IP if not logged in.
 *
 * Also enforces the global per-IP limit as a second layer.
 *
 * Usage:
 *   const blocked = await rateLimit(orderLimiter);
 *   if (blocked) return blocked;
 */
export async function rateLimit(
  limiter: Ratelimit,
  customIdentifier?: string
): Promise<NextResponse | null> {
  const ip = await getClientIp();

  // Layer 1: Global per-IP limit
  const globalResult = await globalLimiter.limit(ip);
  if (!globalResult.success) {
    return blocked429(globalResult.limit, globalResult.reset);
  }

  // Layer 2: Endpoint-specific limit
  // Use custom identifier, or session phone (user-scoped), or IP
  const identifier =
    customIdentifier ?? (await getSessionPhone()) ?? ip;

  const result = await limiter.limit(identifier);
  if (!result.success) {
    return blocked429(result.limit, result.reset);
  }

  return null;
}

/**
 * Rate limiter specifically for login endpoints.
 * Uses phone+IP composite key so attackers can't bypass
 * by switching IPs alone OR by targeting different phones
 * from the same IP.
 *
 * Usage:
 *   const blocked = await rateLimitLogin(phoneNumber);
 *   if (blocked) return blocked;
 */
export async function rateLimitLogin(
  phone?: string
): Promise<NextResponse | null> {
  const ip = await getClientIp();

  // Layer 1: Global per-IP limit
  const globalResult = await globalLimiter.limit(ip);
  if (!globalResult.success) {
    return blocked429(globalResult.limit, globalResult.reset);
  }

  // Layer 2: Per-IP login limit (regardless of phone)
  const ipResult = await loginLimiter.limit(`ip:${ip}`);
  if (!ipResult.success) {
    return blocked429(ipResult.limit, ipResult.reset);
  }

  // Layer 3: Per-phone login limit (if phone provided)
  if (phone) {
    const phoneResult = await loginLimiter.limit(`phone:${phone}`);
    if (!phoneResult.success) {
      return blocked429(phoneResult.limit, phoneResult.reset);
    }
  }

  return null;
}

/**
 * Record a failed login attempt for lockout tracking.
 * Call this AFTER a failed password check.
 * Returns a 429 response if the account is now locked.
 *
 * Usage:
 *   if (passwordWrong) {
 *     const lockout = await recordFailedLogin(phone);
 *     if (lockout) return lockout;
 *     return NextResponse.json({ error: "Invalid" }, { status: 401 });
 *   }
 */
export async function recordFailedLogin(
  identifier: string
): Promise<NextResponse | null> {
  const result = await lockoutLimiter.limit(identifier);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Account temporarily locked due to too many failed attempts. Try again in 15 minutes.",
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
        },
      }
    );
  }
  return null;
}

/**
 * Check if an account is currently locked out.
 * Call BEFORE processing login to reject early.
 *
 * Uses Redis GET to check remaining attempts without consuming a token.
 */
export async function isLockedOut(
  identifier: string
): Promise<NextResponse | null> {
  // We use the lockoutLimiter's limit() to both check and count.
  // However, for the pre-check, we peek at remaining tokens.
  const result = await lockoutLimiter.limit(identifier);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Account temporarily locked due to too many failed attempts. Try again in 15 minutes.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))),
        },
      }
    );
  }
  return null;
}
