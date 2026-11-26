import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/** https://www.nitai.shop/robots.txt — private and account pages are kept out of search results. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/account", "/cart", "/checkout", "/orders", "/wishlist"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
