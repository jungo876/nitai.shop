"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { categoryKeyMap } from "@/lib/translations";
import ProductCard from "./ProductCard";

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const { t } = useLanguage();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const availableCategories = [
    "All",
    ...CATEGORIES.filter((cat) => products.some((p) => p.category === cat)),
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-card-border bg-card-bg overflow-hidden"
          >
            <div className="aspect-[4/3] animate-shimmer" />
            <div className="p-5 space-y-3">
              <div className="h-5 w-3/4 rounded-lg animate-shimmer" />
              <div className="h-4 w-full rounded-lg animate-shimmer" />
              <div className="h-4 w-2/3 rounded-lg animate-shimmer" />
              <div className="h-11 w-full rounded-xl animate-shimmer mt-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
          <svg className="h-8 w-8 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{t("products_error_title")}</h3>
        <p className="text-sm text-muted">{error}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-4">
          <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{t("products_empty_title")}</h3>
        <p className="text-sm text-muted">{t("products_empty_text")}</p>
      </div>
    );
  }

  function getCategoryLabel(cat: string): string {
    if (cat === "All") return t("products_all");
    const key = categoryKeyMap[cat];
    return key ? t(key) : cat;
  }

  return (
    <div>
      {/* Category Filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
              activeCategory === cat
                ? "bg-primary text-white shadow-md shadow-primary/25"
                : "bg-surface text-muted hover:text-foreground hover:bg-card-border"
            }`}
          >
            {getCategoryLabel(cat)}
            {cat === "All" && (
              <span className="ml-1.5 text-xs opacity-70">({products.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted text-sm">{t("products_no_category")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
