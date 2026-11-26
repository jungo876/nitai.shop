import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getProduct } from "@/server/catalog";
import type { ProductWithVariants } from "@/lib/types";
import { SITE_NAME, jsonLd, metaDescription, siteUrl } from "@/lib/seo";
import { ProductDetails } from "./ProductDetails";

// Rendered on the server on first visit, then cached for 5 minutes (admin edits
// appear within 5 minutes). No product pages are built in advance.
export const revalidate = 300;
export async function generateStaticParams() {
  return [];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Loads the product once per request (shared by metadata and page). */
const loadProduct = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  return (await getProduct(id)) as unknown as ProductWithVariants | null;
});

type Props = { params: Promise<{ id: string }> };

/** Lowest and highest per-unit price across pack sizes and bulk tiers. */
function priceRange(p: ProductWithVariants) {
  const prices = p.product_variants.flatMap((v) => [v.unit_price, ...(v.bulk_prices ?? []).map((b) => b.price_per_unit)]).filter((n) => n > 0);
  return prices.length ? { low: Math.min(...prices), high: Math.max(...prices) } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await loadProduct(id);
  if (!p) return { title: "Product not found", robots: { index: false } };

  const packs = p.product_variants.map((v) => v.label).join(", ");
  const range = priceRange(p);
  const brand = p.companies?.name;
  const title = `${p.name}${packs ? ` (${packs})` : ""}${brand ? ` – ${brand}` : ""}`;
  const summary =
    `${p.category}${brand ? ` by ${brand}` : ""}` +
    (range ? ` from ₹${range.low.toLocaleString("en-IN")}/unit. ` : ". ") +
    (p.description || `Buy ${p.name} at wholesale bulk prices.`);
  const description = metaDescription(summary);
  const url = `${siteUrl()}/products/${p.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: SITE_NAME,
      images: p.image_url ? [{ url: p.image_url, alt: p.name }] : undefined,
    },
    twitter: { card: p.image_url ? "summary_large_image" : "summary", title, description },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const p = await loadProduct(id);
  if (!p) notFound();

  const url = `${siteUrl()}/products/${p.id}`;
  const range = priceRange(p);
  const availability =
    p.status === "active" ? "https://schema.org/InStock" : p.status === "coming_soon" ? "https://schema.org/PreOrder" : "https://schema.org/OutOfStock";

  // Structured data so search results can show price, availability and brand.
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || undefined,
    image: p.image_url ? [p.image_url] : undefined,
    sku: p.id,
    category: p.category,
    brand: p.companies?.name ? { "@type": "Brand", name: p.companies.name } : undefined,
    offers: range
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: range.low,
          highPrice: range.high,
          offerCount: p.product_variants.length,
          availability,
          url,
          seller: { "@type": "Organization", name: SITE_NAME },
        }
      : undefined,
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      p.home_category
        ? { "@type": "ListItem", position: 2, name: p.home_category, item: `${siteUrl()}/products?home_category=${encodeURIComponent(p.home_category)}` }
        : { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl()}/products` },
      { "@type": "ListItem", position: 3, name: p.name, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(product) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbs) }} />
      <ProductDetails key={p.id} id={p.id} initialProduct={p} />
    </>
  );
}
