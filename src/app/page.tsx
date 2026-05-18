"use client";

import { useEffect, useState } from "react";
import type { Company, ProductWithVariants } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import HeroCarousel from "@/components/HeroCarousel";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  const { t } = useLanguage();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [topProducts, setTopProducts] = useState<ProductWithVariants[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  const [allProducts, setAllProducts] = useState<ProductWithVariants[]>([]);
  const [loadingAll, setLoadingAll] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<ProductWithVariants[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    async function doSearch() {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedSearch)}&limit=10&offset=0`);
        const data = await res.json();
        setSearchResults(data || []);
        setSearchOffset(0);
        setSearchHasMore(data?.length === 10);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }
    doSearch();
  }, [debouncedSearch]);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await fetch("/api/companies");
        if (!res.ok) throw new Error("Failed to fetch companies");
        setCompanies(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, []);

  useEffect(() => {
    async function fetchAllProducts() {
      try {
        const res = await fetch(`/api/products?limit=10&offset=0`);
        const data = await res.json();
        setAllProducts(data || []);
        if (!data || data.length < 10) setHasMore(false);
      } catch (err) {
        console.error("Failed to fetch all products", err);
      } finally {
        setLoadingAll(false);
      }
    }
    fetchAllProducts();
  }, []);

  useEffect(() => {
    async function fetchTopProducts() {
      try {
        let res = await fetch("/api/products?top_selling=true&limit=10");
        let data = await res.json();

        if (!data || data.length === 0) {
          res = await fetch("/api/products?limit=5");
          data = await res.json();
        }

        setTopProducts(data || []);
      } catch (err) {
        console.error("Failed to fetch top products", err);
      } finally {
        setLoadingTop(false);
      }
    }
    fetchTopProducts();
  }, []);

  async function handleLoadMore() {
    setFetchingMore(true);
    const nextOffset = offset + 10;
    try {
      const res = await fetch(`/api/products?limit=10&offset=${nextOffset}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setAllProducts(prev => [...prev, ...data]);
        setOffset(nextOffset);
        if (data.length < 10) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more", err);
    } finally {
      setFetchingMore(false);
    }
  }

  async function handleLoadMoreSearch() {
    setFetchingMore(true);
    const nextOffset = searchOffset + 10;
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedSearch)}&limit=10&offset=${nextOffset}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setSearchResults(prev => [...prev, ...data]);
        setSearchOffset(nextOffset);
        if (data.length < 10) setSearchHasMore(false);
      } else {
        setSearchHasMore(false);
      }
    } catch (err) {
      console.error("Search load more failed", err);
    } finally {
      setFetchingMore(false);
    }
  }

  return (
    <>
      {/* Sticky Floating Search Bar */}
      <div
        className={`sticky z-50 px-3 sm:px-6 lg:px-8 transition-all duration-300 w-full ${isScrolled ? "top-9 py-9" : "top-3 py-3"}`}
      >
        <div
          className={`mx-auto max-w-2xl relative flex items-center backdrop-blur-md rounded-full h-[46px] px-4 sm:px-5 transition-all duration-300 ${isScrolled ? "bg-surface/90 shadow-md border border-card-border/50" : "bg-surface shadow-sm border border-card-border hover:shadow-md hover:border-primary/30"}`}
        >
          {/* Left: Search Icon */}
          <div className="flex-shrink-0 flex items-center justify-center mr-3">
            <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Center: Input */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted py-2 w-full h-full text-base"
          />

          {/* Right Actions */}
          <div className="flex items-center flex-shrink-0 ml-2">
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="p-1.5 text-muted hover:text-foreground transition-colors flex items-center justify-center"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-card-border mx-2" />

            {/* Mic Icon */}
            <button
              className="p-1.5 text-muted hover:text-primary transition-colors flex items-center justify-center"
              aria-label="Voice search"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {debouncedSearch.trim() ? (
        <section className="bg-background pt-6 pb-20 min-h-[50vh]">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl mb-6">Search Results for "{debouncedSearch}"</h2>

            {isSearching ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-56 rounded-2xl bg-card-bg border border-card-border animate-shimmer" />)}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-3xl border border-card-border border-dashed">
                <p className="text-muted font-medium">No matching products found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {searchResults.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
                {searchHasMore && (
                  <div className="mt-12 text-center">
                    <button onClick={handleLoadMoreSearch} disabled={fetchingMore} className="inline-flex items-center justify-center rounded-2xl bg-surface px-8 py-3.5 text-sm font-semibold text-foreground border border-card-border hover:border-primary/50 hover:text-primary disabled:opacity-50 transition-all shadow-sm">
                      {fetchingMore ? "Loading..." : "See More"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      ) : (
        <>
          <HeroCarousel />

          <section className="border-y border-card-border bg-card-bg/50">
            <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: t("stat_products"), value: "50+", icon: "📦" },
                  { label: t("stat_categories"), value: "8+", icon: "🏷️" },
                  { label: t("stat_dealers"), value: "200+", icon: "🤝" },
                  { label: t("stat_years"), value: "10+", icon: "⭐" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3 rounded-xl px-4 py-3">
                    <span className="text-2xl">{stat.icon}</span>
                    <div>
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Top Selling Section */}
          <section className="bg-background pt-10 sm:pt-16">
            <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-1.5">
                  <span className="text-orange-500 text-xl">🔥</span> Top Selling
                </h2>
                <span className="text-xs font-semibold text-primary cursor-pointer hover:underline">View All &rarr;</span>
              </div>

              {loadingTop ? (
                <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-56 w-[72vw] max-w-[280px] shrink-0 rounded-2xl bg-card-bg border border-card-border animate-shimmer" />
                  ))}
                </div>
              ) : topProducts.length > 0 ? (
                <div className="flex overflow-x-auto pb-6 gap-3 snap-x snap-mandatory scrollbar-hide px-1 sm:px-0">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="snap-center shrink-0 w-[72vw] max-w-[280px] sm:w-[280px]">
                      <ProductCard product={product} index={index} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          {/* Companies Section */}
          <section id="companies" className="scroll-mt-20">
            <div className="mx-auto max-w-7xl px-3 py-10 sm:px-6 sm:py-16 lg:px-8">
              <div className="mb-6 text-left">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">Browse by Company</h2>
                <p className="mt-1 text-xs text-muted max-w-2xl sm:text-sm">Explore our trusted manufacturing partners and their complete catalog of agricultural products.</p>
              </div>

              {loading ? (
                <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:pb-0">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="shrink-0 w-[140px] md:w-auto h-40 rounded-2xl animate-shimmer bg-card-bg border border-card-border" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                  <p className="text-danger font-medium">{error}</p>
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-2xl border border-card-border border-dashed">
                  <p className="text-muted font-medium">No companies available</p>
                </div>
              ) : (
                <div className="flex overflow-x-auto pb-6 gap-3 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 lg:grid-cols-4 md:overflow-visible md:pb-0 px-1 sm:px-0">
                  {companies.map(c => (
                    <Link key={c.id} href={`/company/${c.id}`} className="snap-center shrink-0 w-[140px] md:w-auto group flex flex-col items-center justify-center gap-3 rounded-2xl border border-card-border bg-card-bg p-4 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <div className="relative h-20 w-full max-w-[100px] flex items-center justify-center z-10">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={c.name} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-sm" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-card-border shadow-sm group-hover:scale-110 transition-transform duration-500">
                            <span className="text-2xl font-bold text-muted group-hover:text-primary transition-colors">{c.name.charAt(0)}</span>
                          </div>
                        )}
                      </div>

                      <span className="text-center font-bold text-foreground group-hover:text-primary transition-colors text-sm line-clamp-2 px-2 z-10">{c.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* All Products Section */}
          <section id="all-products" className="bg-card-bg/30 border-t border-card-border pb-20">
            <div className="mx-auto max-w-7xl px-3 py-10 sm:px-6 sm:py-16 lg:px-8">
              <div className="mb-6 text-left">
                <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">All Products</h2>
                <p className="mt-1 text-xs text-muted max-w-2xl sm:text-sm">Browse our entire collection of agricultural solutions.</p>
              </div>

              {loadingAll ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="h-56 rounded-2xl bg-card-bg border border-card-border animate-shimmer" />
                  ))}
                </div>
              ) : allProducts.length === 0 ? (
                <div className="text-center py-12 bg-surface rounded-2xl border border-card-border border-dashed">
                  <p className="text-muted font-medium">No products found</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {allProducts.map((product, index) => (
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
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Loading...
                          </>
                        ) : "See More Products"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
