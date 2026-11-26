import { NextRequest } from "next/server";

export const BASE = "http://localhost:3000";

let ipCounter = 0;
/** A distinct client IP per call so per-IP limits don't interfere between tests. */
export function freshIp() {
  ipCounter++;
  return `10.1.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

export function makeReq(
  method: string,
  path: string,
  opts: { body?: unknown; cookie?: string; origin?: string | null; ip?: string; headers?: Record<string, string> } = {}
) {
  const h = new Headers(opts.headers);
  if (opts.body !== undefined) h.set("content-type", "application/json");
  if (opts.cookie) h.set("cookie", opts.cookie);
  if (opts.origin !== null) h.set("origin", opts.origin ?? BASE);
  h.set("x-forwarded-for", opts.ip ?? "10.0.0.1");
  return new NextRequest(BASE + path, {
    method,
    headers: h,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

/** Extract `name=value` for a Set-Cookie header of the response. */
export function cookieFrom(res: Response, name: string): string | null {
  const all = res.headers.getSetCookie?.() ?? [];
  for (const c of all) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k.trim() === name && v) return `${name}=${v}`;
  }
  return null;
}

export async function body<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T;
}
