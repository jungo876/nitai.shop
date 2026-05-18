"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductWithVariants } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { categoryKeyMap } from "@/lib/translations";

interface ProductCardProps {
  product: ProductWithVariants;
  index?: number;
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Insecticide: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Fungicide: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    Herbicide: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    Fertilizer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    "Plant Growth Regulator": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    "Bio Pesticide": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    Rodenticide: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "Seed Treatment": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  };
  return colors[category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const staggerClass = `stagger-${Math.min((index % 6) + 1, 6)}`;
  const { t } = useLanguage();
  const { isLoggedIn, requireAuth } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();

  const liked = isWishlisted(product.id);

  const categoryKey = categoryKeyMap[product.category];
  const translatedCategory = categoryKey ? t(categoryKey) : product.category;

  const variants = product.product_variants || [];
  const hasVariants = variants.length > 0;

  // Pick default variant — first one (or cheapest by unit_price)
  const defaultVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.reduce((cheapest, v) =>
      v.unit_price < cheapest.unit_price ? v : cheapest
    , variants[0]);
  }, [variants, hasVariants]);

  const unitPrice = defaultVariant?.unit_price || 0;

  // Find the best bulk price across all variants for the teaser
  const bulkTeaser = useMemo(() => {
    let lowestBulkPrice = Infinity;
    let maxSavings = 0;

    for (const v of variants) {
      const bulkPrices = v.bulk_prices || [];
      for (const bp of bulkPrices) {
        if (bp.price_per_unit < lowestBulkPrice) {
          lowestBulkPrice = bp.price_per_unit;
        }
        const saving = (v.unit_price - bp.price_per_unit) * bp.box_count * (v.units_per_box || 1);
        if (saving > maxSavings) {
          maxSavings = Math.round(saving);
        }
      }
    }

    if (lowestBulkPrice < Infinity && lowestBulkPrice < unitPrice) {
      return { type: "from" as const, price: lowestBulkPrice, savings: maxSavings };
    }
    return null;
  }, [variants, unitPrice]);

  return (
    <div className={`animate-fade-in-up ${staggerClass} opacity-0 group relative flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1`}>
      {/* Wishlist Heart */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isLoggedIn) {
            requireAuth({ type: "wishlist" });
            return;
          }
          toggleWishlist(product.id);
        }}
        className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-sm hover:scale-110 active:scale-95 transition-all duration-200"
        aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
      >
        {liked ? (
          <svg className="h-[18px] w-[18px] text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        ) : (
          <svg className="h-[18px] w-[18px] text-muted/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        )}
      </button>

      {/* Clickable product link */}
      <Link href={`/products/${product.id}`} className="flex flex-col flex-1">
        {/* Image */}
        <div className="relative h-[140px] sm:h-[160px] w-full overflow-hidden bg-surface">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg className="h-12 w-12 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          )}
          {/* Category Badge */}
          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${getCategoryColor(product.category)}`}>
              {translatedCategory}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-3">
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {defaultVariant && (
            <span className="text-[11px] font-medium text-muted mb-1.5">
              {defaultVariant.label}
            </span>
          )}

          {hasVariants && (
            <div className="mb-2">
              <span className="text-base font-extrabold text-primary">₹{unitPrice}</span>
              <span className="text-[10px] text-muted ml-0.5">/unit</span>
            </div>
          )}

          {bulkTeaser && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary-light rounded-full px-2 py-0.5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                Bulk from ₹{bulkTeaser.price}
              </span>
            </div>
          )}

          <div className="mt-auto">
            <span className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all duration-200">
              {t("products_view_details")}
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
