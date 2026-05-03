"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { ProductWithVariants } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { categoryKeyMap } from "@/lib/translations";
import BulkPricingSelector from "./BulkPricingSelector";

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
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedBulkIdx, setSelectedBulkIdx] = useState(0);
  const staggerClass = `stagger-${Math.min((index % 6) + 1, 6)}`;
  const { t } = useLanguage();

  const categoryKey = categoryKeyMap[product.category];
  const translatedCategory = categoryKey ? t(categoryKey) : product.category;

  const variants = product.product_variants || [];
  const hasVariants = variants.length > 0;
  const activeVariant = hasVariants ? variants[selectedVariantIdx] : null;

  const sortedBulk = useMemo(
    () => activeVariant?.bulk_prices?.length
      ? [...activeVariant.bulk_prices].sort((a, b) => a.box_count - b.box_count)
      : [],
    [activeVariant]
  );

  const hasBulk = sortedBulk.length > 0;
  const unitPrice = activeVariant?.unit_price || 0;
  const unitsPerBox = activeVariant?.units_per_box || 1;
  const currentPrice = hasBulk ? sortedBulk[selectedBulkIdx].price_per_unit : unitPrice;
  const currentBoxCount = hasBulk ? sortedBulk[selectedBulkIdx].box_count : 1;

  const savings = unitPrice > currentPrice ? unitPrice - currentPrice : 0;
  const savingsPercent = savings > 0 ? Math.round((savings / unitPrice) * 100) : 0;

  // Total calculation
  const totalUnits = currentBoxCount * unitsPerBox;
  const totalPrice = totalUnits * currentPrice;

  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999";
  const msg = encodeURIComponent(
    `Hi, I want to order:\nProduct: *${product.name}*${activeVariant ? ` (${activeVariant.label})` : ""}\nQuantity: *${currentBoxCount} Box (${totalUnits} units)*\nPrice: *₹${currentPrice}/unit*\nTotal: *₹${totalPrice}*`
  );
  const waUrl = `https://wa.me/${phone}?text=${msg}`;

  function onVariantChange(idx: number) {
    setSelectedVariantIdx(idx);
    setSelectedBulkIdx(0);
  }

  return (
    <div className={`animate-fade-in-up ${staggerClass} opacity-0 group relative flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1`}>
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-16 w-16 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${getCategoryColor(product.category)}`}>
            {translatedCategory}
          </span>
        </div>
        {savingsPercent > 0 && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center rounded-full bg-accent/90 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm shadow-md">
              {savingsPercent}% OFF
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-foreground leading-tight mb-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="flex-1 text-sm text-muted leading-relaxed line-clamp-2 mb-3">
          {product.description}
        </p>

        {/* Variant Selector */}
        {hasVariants && variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {variants.map((v, idx) => (
              <button key={v.id} type="button" onClick={() => onVariantChange(idx)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  idx === selectedVariantIdx
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface text-muted border border-card-border hover:border-primary/40"
                }`}>
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Single variant label */}
        {hasVariants && variants.length === 1 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted mb-2">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            {variants[0].label}
          </span>
        )}

        {/* Price */}
        {hasVariants && (
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-primary">₹{currentPrice}</span>
              {savings > 0 && (
                <span className="text-sm text-muted line-through">₹{unitPrice}</span>
              )}
            </div>
            {savings > 0 && <span className="savings-badge">Save ₹{savings}</span>}
          </div>
        )}

        {/* Bulk Pricing */}
        {hasBulk && (
          <BulkPricingSelector bulkPrices={sortedBulk} selectedIndex={selectedBulkIdx} onSelect={setSelectedBulkIdx} unitsPerBox={unitsPerBox} baseUnitPrice={unitPrice} />
        )}

        {/* Total Section */}
        {hasVariants && (
          <div className="total-price-section">
            <div className="total-price-row">
              <span className="total-price-label">Total</span>
              <span className="total-price-value">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="total-price-placeholder">{/* reserved for discounts/offers */}</div>
          </div>
        )}

        {/* WhatsApp */}
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-md shadow-whatsapp/25 hover:bg-whatsapp-hover hover:shadow-lg hover:shadow-whatsapp/30 active:scale-[0.98] transition-all duration-200">
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          {t("products_order_whatsapp")}
        </a>
      </div>
    </div>
  );
}
