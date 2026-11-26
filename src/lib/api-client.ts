/**
 * Browser-side helper for calling our API routes.
 * Always resolves (never throws) with { ok, status, data, error } so UI code
 * can show a friendly message without try/catch everywhere.
 */
export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  code: string | null;
  details: Array<{ field: string; message: string }> | null;
  /** Extra error info sent as an object, e.g. { retryAfterSeconds } or { redirect }. */
  meta: Record<string, unknown> | null;
  redirect: string | null;
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      credentials: "same-origin",
      signal: opts.signal,
    });
    let json: Record<string, unknown> | null = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (res.ok) return { ok: true, status: res.status, data: json as T, error: null, code: null, details: null, meta: null, redirect: null };
    const raw = json?.details;
    const meta = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
    return {
      ok: false,
      status: res.status,
      data: json as T,
      error: (json?.error as string) ?? (res.status === 429 ? "Too many attempts. Please wait a moment." : "Something went wrong. Please try again."),
      code: (json?.code as string) ?? null,
      details: Array.isArray(raw) ? (raw as ApiResult<T>["details"]) : null,
      meta,
      redirect: (meta?.redirect as string) ?? (json?.redirect as string) ?? null,
    };
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return { ok: false, status: 0, data: null, error: "No internet connection. Please check and try again.", code: "network", details: null, meta: null, redirect: null };
  }
}

/** Field -> message map from a validation error, for inline form errors. */
export function fieldErrors(details: ApiResult<unknown>["details"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const d of details ?? []) if (d.field && !out[d.field]) out[d.field] = d.message;
  return out;
}

/** Only allow same-site relative paths as post-login redirects (prevents open redirects). */
export function safeReturnUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url || typeof url !== "string") return fallback;
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return fallback;
  return url;
}
