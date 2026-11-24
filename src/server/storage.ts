import "server-only";
import { randomUUID } from "node:crypto";
import { env, ConfigError } from "./env";
import { badRequest, HttpError } from "./http";
import { log } from "./logger";

/**
 * Image uploads to Supabase Storage using the server's secret key (the public
 * key can no longer write to storage). Files are checked by their actual bytes
 * (magic numbers), not by the name or the browser-supplied type.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SIGNATURES: Array<{ type: string; ext: string; test: (b: Buffer) => boolean }> = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", ext: "webp", test: (b) => b.length > 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { type: "image/gif", ext: "gif", test: (b) => b.length > 6 && /^GIF8[79]a$/.test(b.subarray(0, 6).toString("ascii")) },
];

/**
 * New Supabase secret keys (sb_secret_…) are not JWTs: send them only as
 * `apikey`. Legacy service_role keys (JWTs) also go in Authorization.
 */
export function storageAuthHeaders(key: string): Record<string, string> {
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

/** Deletes an object by its public URL (used by tests / cleanups). */
export async function deleteImageByUrl(publicUrl: string): Promise<boolean> {
  const e = env();
  if (!e.supabaseUrl || !e.supabaseSecretKey) return false;
  const prefix = `${e.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${e.STORAGE_BUCKET}/`;
  if (!publicUrl.startsWith(prefix)) return false;
  const res = await fetch(`${e.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${e.STORAGE_BUCKET}`, {
    method: "DELETE",
    headers: { ...storageAuthHeaders(e.supabaseSecretKey), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [publicUrl.slice(prefix.length)] }),
  });
  return res.ok;
}

export function detectImageType(bytes: Buffer) {
  return SIGNATURES.find((s) => s.test(bytes)) ?? null;
}

export async function uploadImage(file: File, folder: "products" | "brands" | "banners"): Promise<string> {
  if (file.size === 0) throw badRequest("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "Image is too large (maximum 5 MB).", "payload_too_large");
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = detectImageType(bytes);
  if (!kind) throw badRequest("Only JPEG, PNG, WebP or GIF images are allowed.");

  const e = env();
  if (!e.supabaseUrl || !e.supabaseSecretKey) throw new ConfigError("Missing SUPABASE_URL / SUPABASE_SECRET_KEY for uploads");
  const path = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${kind.ext}`;
  const base = e.supabaseUrl.replace(/\/$/, "");

  const res = await fetch(`${base}/storage/v1/object/${e.STORAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      ...storageAuthHeaders(e.supabaseSecretKey),
      "Content-Type": kind.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": "false",
    },
    body: bytes,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    log.error("storage_upload_failed", { status: res.status, body: (await res.text()).slice(0, 200) });
    throw new HttpError(502, "Upload failed. Please try again.", "upload_failed");
  }
  return `${base}/storage/v1/object/public/${e.STORAGE_BUCKET}/${path}`;
}
