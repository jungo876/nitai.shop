"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ProductWithVariants } from "@/lib/types";

interface TopSellingCardProps {
  product: ProductWithVariants;
}

export default function TopSellingCard({ product }: TopSellingCardProps) {
  const variants = product.product_variants || [];
  const hasVariants = variants.length > 0;

  // Pick default variant — first / cheapest
  const defaultVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.reduce((cheapest, v) =>
      v.unit_price < cheapest.unit_price ? v : cheapest
    , variants[0]);
  }, [variants, hasVariants]);

  const unitPrice = defaultVariant?.unit_price || 0;
  const moreVariants = variants.length > 1 ? variants.length - 1 : 0;

  // Best bulk discount info
  const mrpInfo = useMemo(() => {
    if (!defaultVariant) return null;
    const bulkPrices = defaultVariant.bulk_prices || [];
    if (bulkPrices.length === 0) return null;

    const bestBulk = bulkPrices.reduce((best, bp) =>
      bp.price_per_unit < best.price_per_unit ? bp : best
    , bulkPrices[0]);

    if (bestBulk.price_per_unit < unitPrice) {
      const savings = unitPrice - bestBulk.price_per_unit;
      const percentOff = Math.round((savings / unitPrice) * 100);
      return {
        bulkPrice: bestBulk.price_per_unit,
        originalPrice: unitPrice,
        percentOff,
      };
    }
    return null;
  }, [defaultVariant, unitPrice]);

  const displayPrice = mrpInfo ? mrpInfo.bulkPrice : unitPrice;

  return (
    <Link
      href={`/products/${product.id}`}
      className="shrink-0 w-[160px] sm:w-[170px] group"
    >
      <div className="flex flex-col rounded-2xl border border-card-border bg-card-bg overflow-hidden shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]">
        {/* Image */}
        <div className="relative h-[120px] w-full bg-white overflow-hidden">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-contain p-2 mix-blend-multiply transition-transform duration-300 group-hover:scale-105 ${product.status && product.status !== 'active' ? 'grayscale opacity-70' : ''}`}
              sizes="170px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface">
              <svg className="h-10 w-10 text-muted/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10 pointer-events-none">
            {product.status === 'out_of_stock' && (
              <span className="inline-flex items-center rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm shadow-sm">
                OUT OF STOCK
              </span>
            )}
            {product.status === 'coming_soon' && (
              <span className="inline-flex items-center rounded bg-yellow-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm shadow-sm">
                COMING SOON
              </span>
            )}
          </div>
        </div>

        {/* Content — compact row layout */}
        <div className="p-2.5 flex flex-col gap-1">
          {/* Product Name — 2 lines max */}
          <h3 className="text-[12px] font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Variant + Price row */}
          {hasVariants && (
            <div className="flex items-end justify-between gap-1">
              {/* Left: variant info */}
              <div className="flex flex-col gap-0.5 min-w-0">
                {defaultVariant && (
                  <span className="inline-flex items-center self-start rounded bg-primary/10 px-1.5 py-px text-[9px] font-semibold text-primary leading-none">
                    {defaultVariant.label}
                  </span>
                )}
                {moreVariants > 0 && (
                  <span className="text-[9px] text-muted leading-none">
                    +{moreVariants} more
                  </span>
                )}
              </div>

              {/* Right: price stack */}
              <div className="flex flex-col items-end shrink-0">
                {mrpInfo && (
                  <span className="text-[9px] text-muted line-through leading-none">
                    MRP ₹{mrpInfo.originalPrice}
                  </span>
                )}
                <span className="text-[15px] font-extrabold text-primary leading-none">
                  ₹{displayPrice}
                </span>
                {mrpInfo && (
                  <span className="text-[9px] font-bold text-primary leading-none mt-0.5">
                    {mrpInfo.percentOff}% OFF
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
