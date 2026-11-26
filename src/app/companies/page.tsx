"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";

interface Brand {
  id: string;
  name: string;
  logo_url: string;
  product_count: number;
}

/** All brands (companies), linking to each brand's products. */
export default function CompaniesPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<Brand[]>("/api/companies").then((r) => {
      if (!active) return;
      if (r.ok) setBrands(r.data ?? []);
      else setError(r.error ?? "Could not load brands.");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">All Brands</h1>
        <p className="text-sm text-muted mt-1 mb-6">Genuine products from the brands we distribute.</p>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {!brands && !error ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-36 rounded-2xl bg-surface animate-shimmer" />)}
          </div>
        ) : brands && brands.length === 0 ? (
          <p className="text-center py-16 text-muted">No brands yet.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {brands?.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/company/${b.id}`}
                  className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-card-border bg-card-bg p-4 text-center hover:shadow-md hover:border-primary/30 transition-all"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white p-2">
                    {b.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.logo_url} alt="" className="max-h-full max-w-full object-contain" loading="lazy" />
                    ) : (
                      <span className="text-3xl font-bold text-primary">{b.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{b.name}</p>
                    <p className="text-xs text-muted">{b.product_count} product{b.product_count === 1 ? "" : "s"}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
