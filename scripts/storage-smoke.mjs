#!/usr/bin/env node
/**
 * Image-upload smoke test against the REAL Supabase Storage bucket:
 * uploads a 1x1 PNG to `_smoke/`, checks it is publicly readable, deletes it,
 * and checks it is gone. Uses the same requests as src/server/storage.ts.
 * Prints only HTTP statuses — never keys or URLs with secrets.
 *
 *   npm run storage:smoke
 */
import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const bucket = process.env.STORAGE_BUCKET || "product-images";
if (!base || !key) {
  console.error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and/or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const auth = key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };

// 1x1 transparent PNG
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const path = `_smoke/${randomUUID()}.png`;
let ok = true;
const step = (name, pass, detail) => {
  ok &&= pass;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` (${detail})` : ""}`);
};

const up = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "image/png", "x-upsert": "false" },
  body: png,
});
step("upload with server key", up.ok, `HTTP ${up.status}`);
if (!up.ok) {
  const text = await up.text();
  console.log("      storage said:", text.slice(0, 200).replace(key, "[key]"));
  process.exit(1);
}

const pub = await fetch(`${base}/storage/v1/object/public/${bucket}/${path}`);
step("public URL serves the image", pub.ok && (pub.headers.get("content-type") || "").includes("image/png"), `HTTP ${pub.status}`);

const del = await fetch(`${base}/storage/v1/object/${bucket}`, {
  method: "DELETE",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ prefixes: [path] }),
});
step("delete test file", del.ok, `HTTP ${del.status}`);

// Check the bucket listing (the public URL can stay cached on the CDN for a while).
const list = await fetch(`${base}/storage/v1/object/list/${bucket}`, {
  method: "POST",
  headers: { ...auth, "Content-Type": "application/json" },
  body: JSON.stringify({ prefix: "_smoke/", limit: 100 }),
});
const names = list.ok ? (await list.json()).map((o) => o.name) : null;
step("file is gone from the bucket", Array.isArray(names) && !names.includes(path.split("/")[1]), `HTTP ${list.status}`);

console.log(ok ? "\nStorage uploads work." : "\nStorage check FAILED — see above.");
process.exit(ok ? 0 : 1);
