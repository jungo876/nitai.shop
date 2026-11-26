"use client";

import { useEffect, useState } from "react";
import type { Company, ProductWithVariants } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import TopSellingCard from "@/components/TopSellingCard";
import PromoBannerCarousel from "@/components/PromoBannerCarousel";
import { useLanguage } from "@/context/LanguageContext";
import HomeCategoryNav from "@/components/HomeCategoryNav";
import Link from "next/link";
import Image from "next/image";
import { IconPackage, IconTag, IconHandshake, IconStar } from "@/components/icons";

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
    // Results are only shown while there is a search term, so nothing to reset here.
    if (!debouncedSearch.trim()) return;

    async function doSearch() {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(debouncedSearch)}&limit=10&offset=0`);
        const data = await res.json();
        const results = Array.isArray(data) ? data : [];
        setSearchResults(results);
        setSearchOffset(0);
        setSearchHasMore(results.length === 10);
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
        const products = Array.isArray(data) ? data : [];
        setAllProducts(products);
        if (products.length < 10) setHasMore(false);
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
        let top = Array.isArray(data) ? data : [];

        if (top.length === 0) {
          res = await fetch("/api/products?limit=5");
          data = await res.json();
          top = Array.isArray(data) ? data : [];
        }

        setTopProducts(top);
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
      const more = Array.isArray(data) ? data : [];
      if (more.length > 0) {
        setAllProducts(prev => [...prev, ...more]);
        setOffset(nextOffset);
        if (more.length < 10) setHasMore(false);
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
      const moreResults = Array.isArray(data) ? data : [];
      if (moreResults.length > 0) {
        setSearchResults(prev => [...prev, ...moreResults]);
        setSearchOffset(nextOffset);
        if (moreResults.length < 10) setSearchHasMore(false);
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
      <h1 className="sr-only">NCK Agro — wholesale pesticides, fungicides, herbicides and fertilisers online</h1>
      {/* Sticky Floating Search Bar */}
      <div
        className={`sticky z-40 px-3 sm:px-6 lg:px-8 transition-all duration-300 w-full ${isScrolled ? "top-[56px] md:top-[64px] py-2" : "top-[56px] md:top-[64px] py-3"}`}
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
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl mb-6">Search results for &ldquo;{debouncedSearch}&rdquo;</h2>

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
          <HomeCategoryNav />
          <PromoBannerCarousel />

          {/* Top Selling Section */}
          <section className="pt-4 sm:pt-6">
            {/* Green header bar */}
            <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between rounded-t-xl bg-primary px-4 py-2.5">
                <h2 className="text-sm font-bold text-white sm:text-base flex items-center gap-1.5">
                  <span>🔥</span> Top Selling
                </h2>
                <Link href="/products" className="text-xs font-semibold text-white/90 hover:text-white transition-colors">
                  View All &rarr;
                </Link>
              </div>
            </div>

            {/* Cards area — sits right below the green bar */}
            <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="rounded-b-xl bg-card-bg border border-card-border border-t-0 px-3 py-3">
                {loadingTop ? (
                  <div className="flex overflow-x-auto gap-3 scrollbar-hide">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="shrink-0 w-[160px] sm:w-[170px]">
                        <div className="rounded-2xl bg-surface border border-card-border animate-shimmer">
                          <div className="h-[120px] bg-surface rounded-t-2xl" />
                          <div className="p-2.5 space-y-2">
                            <div className="h-3 w-full bg-card-bg rounded" />
                            <div className="h-3 w-2/3 bg-card-bg rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : topProducts.length > 0 ? (
                  <div className="flex overflow-x-auto gap-3 scrollbar-hide -mx-1 px-1">
                    {topProducts.map((product) => (
                      <TopSellingCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {/* Companies Section */}
          <section id="companies" className="scroll-mt-20 bg-[#8b2382] pt-10 pb-8 sm:pt-14 sm:pb-12">
            <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
              <div className="mb-6 text-center">
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mb-1">Shop By</p>
                <h2 className="text-xl font-extrabold tracking-tight text-white sm:text-3xl">Popular Brands</h2>
              </div>

              {loading ? (
                <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-4 scrollbar-hide px-1 sm:px-0">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="shrink-0 w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] rounded-[20px] animate-shimmer bg-white/20 border border-white/10" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8 bg-white/10 rounded-2xl border border-white/20">
                  <p className="text-white font-medium">{error}</p>
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-12 bg-white/10 rounded-2xl border border-white/20 border-dashed">
                  <p className="text-white/80 font-medium">No companies available</p>
                </div>
              ) : (
                <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-4 scrollbar-hide px-1 sm:px-0 snap-x snap-mandatory">
                  {companies.map(c => (
                    <Link key={c.id} href={`/company/${c.id}`} className="snap-center shrink-0 w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] flex items-center justify-center rounded-[20px] bg-white p-4 shadow-sm transition-transform duration-300 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]">
                      {c.logo_url ? (
                        <img src={c.logo_url} alt={c.name} className="max-h-full max-w-full object-contain mix-blend-multiply" />
                      ) : (
                        <span className="text-2xl font-bold text-primary">{c.name.charAt(0)}</span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-4 text-center">
                <Link href="/companies" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/90 hover:text-white transition-colors">
                  Explore All <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
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

      {/* About — plain text that tells search engines and new visitors what we sell */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 pt-4">
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6">
          <h2 className="text-base font-bold text-foreground">Wholesale agro inputs for dealers, retailers and farmers</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            NCK Agro supplies genuine insecticides, fungicides, herbicides, plant growth regulators and fertilisers from
            leading brands at wholesale prices. Choose a pack size, buy by the box for bulk discounts, and pay securely online
            — or confirm with a small advance and pay the rest on delivery (Cash on Delivery). Track every order under My
            Orders. Need help choosing a product for your crop? Contact us on WhatsApp.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted" lang="bn">
            কীটনাশক, ছত্রাকনাশক, আগাছানাশক ও সার — পাইকারি দামে অনলাইনে অর্ডার করুন। বক্স হিসেবে কিনলে আরও কম দাম।
          </p>
        </div>
      </section>
    </>
  );
}
