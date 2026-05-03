"use client";

import { useEffect, useState, use } from "react";
import type { Company, ProductWithVariants } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [compRes, prodRes] = await Promise.all([
          fetch(`/api/companies/${id}`),
          fetch(`/api/products?company_id=${id}`)
        ]);

        if (!compRes.ok) throw new Error("Failed to fetch company details");
        if (!prodRes.ok) throw new Error("Failed to fetch company products");

        setCompany(await compRes.json());
        setProducts(await prodRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-10 w-32 rounded-lg bg-surface animate-shimmer mb-8" />
          <div className="mb-10 flex items-center gap-6">
            <div className="h-24 w-24 rounded-2xl bg-surface animate-shimmer shrink-0" />
            <div className="space-y-3 flex-1">
              <div className="h-8 w-64 rounded-xl bg-surface animate-shimmer" />
              <div className="h-5 w-40 rounded-lg bg-surface animate-shimmer" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-card-bg border border-card-border animate-shimmer" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-4">Oops!</h2>
        <p className="text-muted mb-8">{error || "Company not found"}</p>
        <Link href="/" className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
          Browse Companies
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Nav */}
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center">
          <Link href="/#companies" className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Company Header */}
        <div className="mb-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl border border-card-border bg-card-bg p-4 shadow-sm">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-5xl font-bold text-muted">{company.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex flex-col justify-center sm:pt-4">
            <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight mb-2">{company.name}</h1>
            <p className="text-muted font-medium bg-surface inline-flex items-center px-3 py-1 rounded-full text-sm mx-auto sm:mx-0 w-fit border border-card-border">
              <span className="w-2 h-2 rounded-full bg-primary mr-2" />
              {products.length} {products.length === 1 ? "Product" : "Products"} Available
            </p>
          </div>
        </div>

        {/* Products Grid */}
        <div className="mt-12">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-dashed border-card-border bg-card-bg/30">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface mb-4">
                <svg className="h-8 w-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <p className="text-muted font-medium">{t("products_empty_text")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
