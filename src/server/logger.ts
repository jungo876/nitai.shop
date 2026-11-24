import "server-only";

/**
 * Minimal structured logger.
 * - Production: one JSON object per line (Vercel / log drains can parse it).
 * - Development: readable single lines.
 * - Sensitive fields (phone numbers, tokens, secrets, cookies, OTP codes,
 *   signatures) are redacted by key name before anything is written.
 */

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE_KEY = /^(phone|phone_number|whatsapp_number|mobile|token|session|secret|password|authorization|cookie|otp|otp_code|signature|razorpay_signature|api_?key|key_secret|card|vpa|email)$/i;

function minLevel(): Level {
  const configured = process.env.LOG_LEVEL as Level | undefined;
  if (configured && configured in ORDER) return configured;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const d = String(phone);
  return d.length <= 4 ? "****" : `${d.slice(0, 2)}${"*".repeat(d.length - 4)}${d.slice(-2)}`;
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, code: (value as { code?: unknown }).code, stack: process.env.NODE_ENV === "production" ? undefined : value.stack };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? (k.toLowerCase().includes("phone") && typeof v === "string" ? maskPhone(v) : "[redacted]") : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (ORDER[level] < ORDER[minLevel()]) return;
  const ctx = context ? (redact(context) as Record<string, unknown>) : undefined;
  const stream = level === "error" || level === "warn" ? console.error : console.log;
  if (process.env.NODE_ENV === "production") {
    stream(JSON.stringify({ level, time: new Date().toISOString(), message, ...ctx }));
  } else {
    stream(`[${level}] ${message}${ctx && Object.keys(ctx).length ? " " + JSON.stringify(ctx) : ""}`);
  }
}

export const log = {
  debug: (message: string, context?: Record<string, unknown>) => write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};
