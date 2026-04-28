"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { categoryKeyMap } from "@/lib/translations";

interface ProductCardProps {
  product: Product;
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

function buildWhatsAppUrl(productName: string, quantity: number): string {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999";
  const message = encodeURIComponent(
    `Hi, I want to order:\nProduct: *${productName}*\nQuantity: *${quantity}*`
  );
  return `https://wa.me/${phone}?text=${message}`;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const staggerClass = `stagger-${Math.min((index % 6) + 1, 6)}`;
  const { t } = useLanguage();

  const categoryKey = categoryKeyMap[product.category];
  const translatedCategory = categoryKey ? t(categoryKey) : product.category;

  return (
    <div
      className={`animate-fade-in-up ${staggerClass} opacity-0 group relative flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-16 w-16 text-muted/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
              />
            </svg>
          </div>
        )}
        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${getCategoryColor(
              product.category
            )}`}
          >
            {translatedCategory}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <p className="flex-1 text-sm text-muted leading-relaxed line-clamp-3 mb-4">
          {product.description}
        </p>

        {/* Quantity Selector + WhatsApp Button Row */}
        <div className="flex items-stretch gap-2">
          {/* Quantity Stepper */}
          <div className="flex items-center rounded-xl border border-card-border bg-surface shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-full items-center justify-center w-9 text-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-l-xl hover:bg-card-border/50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <span className="w-9 text-center text-sm font-bold text-foreground tabular-nums select-none">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Increase quantity"
              className="flex h-full items-center justify-center w-9 text-muted hover:text-foreground transition-colors rounded-r-xl hover:bg-card-border/50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>

          {/* WhatsApp Order Button */}
          <a
            href={buildWhatsAppUrl(product.name, quantity)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp px-4 py-3 text-sm font-semibold text-white shadow-md shadow-whatsapp/25 hover:bg-whatsapp-hover hover:shadow-lg hover:shadow-whatsapp/30 active:scale-[0.98] transition-all duration-200"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            {t("products_order_whatsapp")}
          </a>
        </div>
      </div>
    </div>
  );
}
