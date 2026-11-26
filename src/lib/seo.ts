/** Shared SEO helpers (safe for server and client code). */

export const SITE_NAME = "NCK Agro";

/** Public site address, e.g. https://www.nitai.shop (from APP_URL; no trailing slash). */
export function siteUrl(): string {
  return (process.env.APP_URL || "https://www.nitai.shop").replace(/\/$/, "");
}

export const DEFAULT_DESCRIPTION =
  "Buy insecticides, fungicides, herbicides, fertilisers and seeds at wholesale prices. " +
  "Bulk box pricing for retailers, dealers and farmers, secure online payment and Cash on Delivery across India.";

/** One-line plain-text summary for meta descriptions (max ~160 chars). */
export function metaDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,.;:\s]+$/, "") + "…";
}

/** JSON for a <script type="application/ld+json"> tag, safe against "</script>" injection. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
