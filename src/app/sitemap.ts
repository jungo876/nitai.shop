import type { MetadataRoute } from "next";
import { db } from "@/server/db";
import { log } from "@/server/logger";
import { siteUrl } from "@/lib/seo";

// Built on each request so new products appear immediately (and the build
// never needs the database).
export const dynamic = "force-dynamic";

/** All public pages for search engines: https://www.nitai.shop/sitemap.xml */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/companies`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/offers`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/store`, changeFrequency: "weekly", priority: 0.6 },
    ...["/contact", "/terms", "/privacy", "/refund-policy", "/shipping-policy"].map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
  try {
    const sql = db();
    const products = await sql`select id, coalesce(updated_at, created_at) as updated from products where status <> 'hidden' order by created_at desc limit 5000`;
    const brands = await sql`select id from companies order by name`;
    for (const p of products) {
      pages.push({ url: `${base}/products/${p.id}`, lastModified: new Date(p.updated as string), changeFrequency: "weekly", priority: 0.8 });
    }
    for (const c of brands) pages.push({ url: `${base}/company/${c.id}`, changeFrequency: "weekly", priority: 0.6 });
  } catch (err) {
    log.error("sitemap_failed", { err });
  }
  return pages;
}
