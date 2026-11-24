"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";

interface WishlistProduct {
  wishlist_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  category: string;
  variant_label: string;
  unit_price: number;
  created_at: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { toggleWishlist, refreshWishlist } = useWishlist();

  const [items, setItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace("/");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    async function load() {
      if (!isLoggedIn) return;
      try {
        const res = await fetch("/api/wishlist");
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isLoggedIn]);

  async function handleRemove(productId: string) {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
    await toggleWishlist(productId);
  }

  // Loading
  if (authLoading || (isLoggedIn && loading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <div className="h-6 w-16 bg-surface animate-shimmer rounded" />
            <div className="h-5 w-20 bg-surface animate-shimmer rounded" />
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-card-border bg-card-bg p-4 animate-shimmer">
              <div className="flex gap-4">
                <div className="h-20 w-20 rounded-xl bg-surface shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-surface rounded" />
                  <div className="h-4 w-1/2 bg-surface rounded" />
                  <div className="h-4 w-1/3 bg-surface rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back
            </Link>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="h-24 w-24 bg-surface rounded-full flex items-center justify-center mb-6">
            <svg className="h-12 w-12 text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Your wishlist is empty</h2>
          <p className="text-muted text-sm mb-8 max-w-xs">
            Save products you like and come back to them later.
          </p>
          <Link
            href="/"
            className="rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200"
          >
            Explore Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </Link>
          <span className="text-xs font-semibold text-foreground tracking-wider uppercase">
            Wishlist ({items.length})
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">
          My Wishlist
          <span className="text-muted text-base font-normal ml-2">({items.length} {items.length === 1 ? "item" : "items"})</span>
        </h1>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.wishlist_id}
              className="rounded-2xl border border-card-border bg-card-bg p-4 sm:p-5"
            >
              <div className="flex gap-4">
                {/* Image */}
                <Link href={`/products/${item.product_id}`} className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-xl overflow-hidden bg-surface shrink-0">
                  {item.product_image ? (
                    <Image
                      src={item.product_image}
                      alt={item.product_name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-8 w-8 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product_id}`}>
                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors">
                      {item.product_name}
                    </h3>
                  </Link>
                  {item.variant_label && (
                    <p className="text-xs text-muted mt-1">{item.variant_label}</p>
                  )}
                  {item.unit_price > 0 && (
                    <p className="text-base font-extrabold text-primary mt-1.5">
                      ₹{item.unit_price}<span className="text-xs font-normal text-muted">/unit</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-3 border-t border-card-border pt-3">
                <Link
                  href={`/products/${item.product_id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all duration-200"
                >
                  View Product
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <button
                  onClick={() => handleRemove(item.product_id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors px-3 py-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
