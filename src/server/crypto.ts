import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** URL-safe random token (default 256 bits). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmacSha256Hex(secret: string, data: string | Buffer): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Constant-time comparison of two hex strings (false for malformed / different length). */
export function safeEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const A = Buffer.from(a, "hex");
  const B = Buffer.from(b, "hex");
  return A.length > 0 && A.length === B.length && timingSafeEqual(A, B);
}

/** Numeric one-time code with leading zeros, e.g. "042917". Uses a CSPRNG. */
export function randomNumericCode(digits = 6): string {
  return String(randomInt(0, 10 ** digits)).padStart(digits, "0");
}
