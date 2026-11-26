import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "./env";
import { tooManyRequests } from "./http";
import { log } from "./logger";

/**
 * General-purpose API rate limiting.
 * - With UPSTASH_REDIS_REST_URL/TOKEN: shared sliding-window limits (production).
 * - Without: an in-memory limiter per server instance (development / fallback).
 * - If Redis is unreachable we fall back to memory instead of failing requests.
 *
 * Login codes (OTP) have their own database-backed limits in auth/otp.ts,
 * which work even without Redis.
 */

export type LimitName = "auth" | "cart" | "checkout" | "write" | "read" | "admin";

const LIMITS: Record<LimitName, { tokens: number; windowSeconds: number }> = {
  auth: { tokens: 10, windowSeconds: 60 },
  cart: { tokens: 60, windowSeconds: 60 },
  checkout: { tokens: 15, windowSeconds: 60 },
  write: { tokens: 30, windowSeconds: 60 },
  read: { tokens: 240, windowSeconds: 60 },
  admin: { tokens: 300, windowSeconds: 60 },
};

let upstash: Record<LimitName, Ratelimit> | null | undefined;

function getUpstash() {
  if (upstash !== undefined) return upstash;
  const e = env();
  if (!e.UPSTASH_REDIS_REST_URL || !e.UPSTASH_REDIS_REST_TOKEN) return (upstash = null);
  const redis = new Redis({ url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN });
  upstash = Object.fromEntries(
    (Object.keys(LIMITS) as LimitName[]).map((name) => [
      name,
      new Ratelimit({
        redis,
        prefix: `nck:rl:${name}`,
        limiter: Ratelimit.slidingWindow(LIMITS[name].tokens, `${LIMITS[name].windowSeconds} s`),
        timeout: 1500, // if Redis is slow, allow the request rather than hang
      }),
    ])
  ) as Record<LimitName, Ratelimit>;
  return upstash;
}

// In-memory fallback: name:key -> timestamps (ms)
const memory = new Map<string, number[]>();
function memoryLimit(name: LimitName, key: string) {
  const { tokens, windowSeconds } = LIMITS[name];
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const k = `${name}:${key}`;
  const hits = (memory.get(k) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= tokens) {
    memory.set(k, hits);
    return { success: false, reset: hits[0] + windowMs };
  }
  hits.push(now);
  memory.set(k, hits);
  if (memory.size > 50_000) memory.clear(); // crude memory cap
  return { success: true, reset: now + windowMs };
}

/** Throws 429 if `key` exceeded the named limit. */
export async function enforceRateLimit(name: LimitName, key: string): Promise<void> {
  let result: { success: boolean; reset: number };
  const limiters = getUpstash();
  if (limiters) {
    try {
      result = await limiters[name].limit(key);
    } catch (err) {
      log.warn("rate_limit_redis_unavailable", { err });
      result = memoryLimit(name, key);
    }
  } else {
    result = memoryLimit(name, key);
  }
  if (!result.success) {
    throw tooManyRequests("Too many requests. Please wait a moment and try again.", (result.reset - Date.now()) / 1000);
  }
}

/** For tests. */
export function resetMemoryRateLimits() {
  memory.clear();
  upstash = undefined;
}
