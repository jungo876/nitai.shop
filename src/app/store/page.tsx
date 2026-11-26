"use client";

import { useEffect, useState } from "react";
import type { ProductWithVariants } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import { CATEGORIES } from "@/lib/types";

export default function StorePage() {
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const catParam = activeCategory !== "All" ? `&category=${encodeURIComponent(activeCategory)}` : "";
        const res = await fetch(`/api/products?limit=12&offset=0${catParam}`);
        const data = await res.json();
        setProducts(data || []);
        setOffset(0);
        setHasMore((data?.length || 0) === 12);
      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [activeCategory]);

  async function handleLoadMore() {
    setLoadingMore(true);
    const nextOffset = offset + 12;
    try {
      const catParam = activeCategory !== "All" ? `&category=${encodeURIComponent(activeCategory)}` : "";
      const res = await fetch(`/api/products?limit=12&offset=${nextOffset}${catParam}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setProducts((prev) => [...prev, ...data]);
        setOffset(nextOffset);
        if (data.length < 12) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more", err);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Category Pills */}
      <div className="sticky top-14 md:top-16 z-30 bg-background/95 backdrop-blur-md border-b border-card-border">
        <div className="flex overflow-x-auto gap-2 px-4 py-3 scrollbar-hide">
          {["All", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                activeCategory === cat
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface text-muted border border-card-border hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">
            {activeCategory === "All" ? "All Products" : activeCategory}
          </h1>
          <span className="text-xs text-muted">{products.length} products</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-card-bg border border-card-border animate-shimmer" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-card-border border-dashed">
            <svg className="h-12 w-12 text-muted/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <p className="text-muted font-medium text-sm">No products found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center justify-center rounded-2xl bg-surface px-8 py-3 text-sm font-semibold text-foreground border border-card-border hover:border-primary/50 hover:text-primary disabled:opacity-50 transition-all shadow-sm active:scale-95"
                >
                  {loadingMore ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
