"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { CATEGORIES, HOME_CATEGORIES } from "@/lib/types";

interface P {
  id: string;
  category: string;
  home_category: string | null;
  status: string;
  companies: { id: string; name: string } | null;
}
interface Brand {
  id: string;
  name: string;
  product_count: number;
}

/**
 * Overview of how the catalogue is organised: product types (categories),
 * homepage groups and brands, with product counts. Categories are a fixed list
 * (set in code) so filters and the homepage stay consistent; brands are
 * managed on the Products page.
 */
export default function CategoriesPage() {
  const [products, setProducts] = useState<P[] | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    let active = true;
    api<P[]>("/api/products?include_hidden=true&limit=200").then((r) => active && setProducts(r.ok ? r.data ?? [] : []));
    api<Brand[]>("/api/companies").then((r) => active && r.ok && setBrands(r.data ?? []));
    return () => {
      active = false;
    };
  }, []);

  const count = useMemo(() => {
    const byCat: Record<string, number> = {};
    const byHome: Record<string, number> = {};
    for (const p of products ?? []) {
      byCat[p.category] = (byCat[p.category] ?? 0) + 1;
      const h = p.home_category ?? "(not set)";
      byHome[h] = (byHome[h] ?? 0) + 1;
    }
    return { byCat, byHome };
  }, [products]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories &amp; brands</h1>
          <p className="text-sm text-muted mt-1">How your catalogue is organised. Assign these when you add or edit a product.</p>
        </div>
        <Link href="/admin/products" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Manage products &amp; brands</Link>
      </div>

      <Group title="Homepage groups" desc="The 4 round icons at the top of the homepage.">
        {[...HOME_CATEGORIES, ...(count.byHome["(not set)"] ? ["(not set)"] : [])].map((h) => (
          <Tile key={h} name={h} n={count.byHome[h] ?? 0} href={h === "(not set)" ? undefined : `/products?home_category=${encodeURIComponent(h)}`} warn={h === "(not set)"} />
        ))}
      </Group>

      <Group title="Product types" desc="Used for filters in the Store and for “similar products”.">
        {CATEGORIES.map((c) => <Tile key={c} name={c} n={count.byCat[c] ?? 0} />)}
      </Group>

      <Group title="Brands" desc="Add, rename or delete brands on the Products page.">
        {brands.length === 0 ? <p className="text-sm text-muted">No brands yet.</p> : brands.map((b) => <Tile key={b.id} name={b.name} n={b.product_count} href={`/company/${b.id}`} />)}
      </Group>
    </div>
  );
}

function Group({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted mb-3">{desc}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
    </section>
  );
}
function Tile({ name, n, href, warn }: { name: string; n: number; href?: string; warn?: boolean }) {
  const body = (
    <>
      <p className={`text-sm font-semibold ${warn ? "text-amber-700" : "text-foreground"}`}>{name}</p>
      <p className="text-xs text-muted">{n} product{n === 1 ? "" : "s"}{warn ? " — set a homepage group" : ""}</p>
    </>
  );
  const cls = "rounded-xl border border-card-border bg-card-bg p-4 shadow-sm";
  return href ? <Link href={href} target="_blank" className={`${cls} hover:border-primary/40`}>{body}</Link> : <div className={cls}>{body}</div>;
}
