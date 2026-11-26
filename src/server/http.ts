import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { ConfigError, env } from "./env";
import { log } from "./logger";

/**
 * Shared plumbing for API route handlers:
 *   export const POST = route(async (req) => { ... return json(data) })
 *
 * - Errors become `{ error: string, code: string, details?: [...] }` with the
 *   right status. Unexpected errors are logged with a request id and the client
 *   only sees a generic message (no SQL, stack traces or internals).
 * - Mutating requests (POST/PUT/PATCH/DELETE) from another website are rejected
 *   (CSRF protection on top of SameSite cookies).
 */

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "error",
    public details?: unknown,
    public headers?: Record<string, string>
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, "bad_request", details);
export const unauthorized = (message = "Please log in to continue.") => new HttpError(401, message, "unauthorized");
export const forbidden = (message = "You do not have permission to do this.") => new HttpError(403, message, "forbidden");
export const notFound = (message = "Not found.") => new HttpError(404, message, "not_found");
export const conflict = (message: string, code = "conflict") => new HttpError(409, message, code);
export const tooManyRequests = (message: string, retryAfterSeconds: number) =>
  new HttpError(429, message, "rate_limited", { retryAfterSeconds }, { "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))) });

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Origins that may send state-changing requests: this site (and APP_URL, incl. www/apex twin). */
function allowedOrigins(req: NextRequest): Set<string> {
  const set = new Set<string>([req.nextUrl.origin]);
  const appUrl = env().APP_URL;
  if (appUrl) {
    const u = new URL(appUrl);
    set.add(u.origin);
    const twin = u.hostname.startsWith("www.") ? u.hostname.slice(4) : `www.${u.hostname}`;
    set.add(`${u.protocol}//${twin}${u.port ? ":" + u.port : ""}`);
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) set.add(`${req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")}://${host}`);
  return set;
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) {
    if (!allowedOrigins(req).has(origin)) throw forbidden("Cross-site request blocked.");
    return;
  }
  // Browsers always send Origin on cross-site POSTs; without it, fall back to Fetch Metadata.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") throw forbidden("Cross-site request blocked.");
}

/**
 * The visitor's IP (used for rate limits). Prefers headers set by the hosting
 * platform that visitors cannot fake: Netlify's x-nf-client-connection-ip, then
 * x-real-ip / x-forwarded-for (overwritten by Vercel).
 */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-nf-client-connection-ip")?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Reads and validates a JSON body (size-limited). Throws HttpError on problems. */
export async function readJson<S extends z.ZodType>(req: Request, schema: S, maxBytes = 32 * 1024): Promise<z.infer<S>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Expected a JSON request body.", "unsupported_media_type");
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new HttpError(413, "Request is too large.", "payload_too_large");
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request is too large.", "payload_too_large");
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw badRequest("Invalid JSON.");
  }
  return parseOrThrow(schema, data);
}

export function parseOrThrow<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    const first = details[0];
    throw badRequest(first ? first.message : "Invalid input.", details);
  }
  return result.data;
}

function errorResponse(err: unknown, requestId: string, req: NextRequest): Response {
  if (err instanceof HttpError) {
    if (err.status >= 500) log.error("http_error", { requestId, path: req.nextUrl.pathname, status: err.status, err });
    return NextResponse.json(
      { error: err.message, code: err.code, ...(err.details !== undefined ? { details: err.details } : {}) },
      { status: err.status, headers: { "x-request-id": requestId, ...(err.headers ?? {}) } }
    );
  }
  const isConfig = err instanceof ConfigError;
  log.error(isConfig ? "configuration_error" : "unhandled_error", { requestId, method: req.method, path: req.nextUrl.pathname, err });
  return NextResponse.json(
    {
      error: isConfig ? "This feature is not configured yet. Please contact support." : "Something went wrong. Please try again.",
      code: isConfig ? "not_configured" : "internal_error",
      requestId,
    },
    { status: isConfig ? 503 : 500, headers: { "x-request-id": requestId } }
  );
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response> | Response;

export function route<C = unknown>(handler: Handler<C>, opts: { csrf?: boolean } = {}) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    try {
      if (opts.csrf !== false && MUTATING.has(req.method)) assertSameOrigin(req);
      const res = await handler(req, ctx);
      res.headers.set("x-request-id", requestId);
      if (!res.headers.has("cache-control")) res.headers.set("cache-control", "no-store");
      return res;
    } catch (err) {
      return errorResponse(err, requestId, req);
    }
  };
}

/** UUID path/query parameter guard. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function assertUuid(value: string | null | undefined, what = "id"): string {
  if (!value || !UUID_RE.test(value)) throw badRequest(`Invalid ${what}.`);
  return value.toLowerCase();
}
