"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { ProductWithVariants } from "@/lib/types";
import { HOME_CATEGORIES } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

function ProductsContent() {
  const searchParams = useSearchParams();
  const homeCategory = searchParams.get("home_category");
  const search = searchParams.get("search")?.trim() || null;

  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setOffset(0);
      setHasMore(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "12");
        params.set("offset", "0");
        if (homeCategory) params.set("home_category", homeCategory);
        if (search) params.set("search", search);

        const res = await fetch(`/api/products?${params.toString()}`);
        const data = await res.json();
        setProducts(data || []);
        if (!data || data.length < 12) setHasMore(false);
      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [homeCategory, search]);

  async function handleLoadMore() {
    setFetchingMore(true);
    const nextOffset = offset + 12;
    try {
      const params = new URLSearchParams();
      params.set("limit", "12");
      params.set("offset", String(nextOffset));
      if (homeCategory) params.set("home_category", homeCategory);
      if (search) params.set("search", search);

      const res = await fetch(`/api/products?${params.toString()}`);
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
      setFetchingMore(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-[56px] md:top-[64px] z-30 bg-background/90 backdrop-blur-md border-b border-card-border">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center justify-center h-9 w-9 rounded-full bg-surface border border-card-border text-muted hover:text-foreground transition-colors shrink-0"
              aria-label="Back to home"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">
                {search ? `Results for “${search}”` : homeCategory || "All Products"}
              </h1>
              {homeCategory && (
                <p className="text-xs text-muted">
                  Showing products in {homeCategory}
                </p>
              )}
            </div>
          </div>

          {/* Category pills */}
          {homeCategory && (
            <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
              <Link
                href="/products"
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-card-border text-muted hover:text-foreground hover:border-primary/30 transition-all"
              >
                All
              </Link>
              {HOME_CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  href={`/products?home_category=${encodeURIComponent(cat)}`}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    homeCategory === cat
                      ? "bg-primary text-white border border-primary"
                      : "border border-card-border text-muted hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-56 rounded-2xl bg-card-bg border border-card-border animate-shimmer"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-3xl border border-card-border border-dashed">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-foreground font-semibold text-lg">No products available</p>
            <p className="text-muted text-sm mt-1">
              {homeCategory
                ? `No products found in "${homeCategory}"`
                : "No products found"}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={fetchingMore}
                  className="inline-flex items-center justify-center rounded-2xl bg-surface px-8 py-3.5 text-sm font-semibold text-foreground border border-card-border hover:border-primary/50 hover:text-primary disabled:opacity-50 transition-all shadow-sm"
                >
                  {fetchingMore ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    "See More Products"
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

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background pb-24">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 pt-20">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="h-56 rounded-2xl bg-card-bg border border-card-border animate-shimmer"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
