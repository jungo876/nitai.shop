"use client";

import { useEffect, useState, use, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductWithVariants } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { categoryKeyMap } from "@/lib/translations";
import BulkPricingSelector from "@/components/BulkPricingSelector";

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

/** Randomly pick a tag for recommended products */
const RECOMMENDATION_TAGS = ["Popular", "Similar", "Best Match", "Trending", "Top Pick"];
function getRandomTag(index: number): string {
  return RECOMMENDATION_TAGS[index % RECOMMENDATION_TAGS.length];
}

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const { isLoggedIn, user, requireAuth } = useAuth();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const router = useRouter();

  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedBulkIdx, setSelectedBulkIdx] = useState(0);

  // Recommendations
  const [recommended, setRecommended] = useState<ProductWithVariants[]>([]);
  const [loadingRec, setLoadingRec] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedVariantIdx(0);
    setSelectedBulkIdx(0);
    setRecommended([]);
    setLoadingRec(true);

    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("Product not found");
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  // Fetch recommendations after product loads
  useEffect(() => {
    if (!product) return;

    async function fetchRecommended() {
      try {
        const res = await fetch(`/api/products/recommended?productId=${product!.id}`);
        if (res.ok) {
          const data = await res.json();
          setRecommended(data || []);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations", err);
      } finally {
        setLoadingRec(false);
      }
    }
    fetchRecommended();
  }, [product]);

  const variants = product?.product_variants || [];
  const hasVariants = variants.length > 0;
  const activeVariant = hasVariants ? variants[selectedVariantIdx] : null;

  const sortedBulk = useMemo(
    () => activeVariant?.bulk_prices?.length
      ? [...activeVariant.bulk_prices].sort((a, b) => a.box_count - b.box_count)
      : [],
    [activeVariant]
  );

  const hasBulk = sortedBulk.length > 0;
  const unitPrice = activeVariant?.unit_price || 0;
  const unitsPerBox = activeVariant?.units_per_box || 1;
  const currentPrice = hasBulk ? sortedBulk[selectedBulkIdx].price_per_unit : unitPrice;
  const currentBoxCount = hasBulk ? sortedBulk[selectedBulkIdx].box_count : 1;

  const savings = unitPrice > currentPrice ? unitPrice - currentPrice : 0;
  const savingsPercent = savings > 0 ? Math.round((savings / unitPrice) * 100) : 0;

  const totalUnits = currentBoxCount * unitsPerBox;
  const totalPrice = totalUnits * currentPrice;

  const categoryKey = product ? categoryKeyMap[product.category] : undefined;
  const translatedCategory = categoryKey ? t(categoryKey) : product?.category || "";

  const companyName = product?.companies?.name || "";

  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919999999999";
  const msg = product
    ? encodeURIComponent(
        `Hi, I want to order:\nProduct: *${product.name}*${activeVariant ? ` (${activeVariant.label})` : ""}\nQuantity: *${currentBoxCount} Box (${totalUnits} units)*\nPrice: *₹${currentPrice}/unit*\nTotal: *₹${totalPrice}*`
      )
    : "";
  const waUrl = `https://wa.me/${phone}?text=${msg}`;

  function onVariantChange(idx: number) {
    setSelectedVariantIdx(idx);
    setSelectedBulkIdx(0);
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="h-6 w-20 rounded bg-surface animate-shimmer mb-4" />
          <div className="h-[300px] w-full rounded-2xl bg-surface animate-shimmer mb-6" />
          <div className="space-y-3">
            <div className="h-8 w-3/4 rounded-lg bg-surface animate-shimmer" />
            <div className="h-5 w-1/2 rounded bg-surface animate-shimmer" />
            <div className="h-20 w-full rounded-xl bg-surface animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface mb-6">
          <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h2>
        <p className="text-muted mb-8">{error || "This product may have been removed."}</p>
        <Link href="/" className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Sticky Back Nav */}
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </Link>
          {companyName && (
            <span className="text-xs font-medium text-muted truncate max-w-[180px]">{companyName}</span>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Product Image */}
        <div className="relative w-full h-[280px] sm:h-[360px] rounded-2xl overflow-hidden bg-surface mb-6">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className={`object-contain p-4 mix-blend-multiply ${product.status && product.status !== 'active' ? 'grayscale opacity-70' : ''}`}
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg className="h-20 w-20 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 items-start">
            {product.status === 'out_of_stock' && (
              <span className="inline-flex items-center rounded bg-red-600/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm shadow-md">
                OUT OF STOCK
              </span>
            )}
            {product.status === 'coming_soon' && (
              <span className="inline-flex items-center rounded bg-yellow-500/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm shadow-md">
                COMING SOON
              </span>
            )}
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${getCategoryColor(product.category)}`}>
              {translatedCategory}
            </span>
          </div>
          {savingsPercent > 0 && (
            <div className="absolute top-4 right-14">
              <span className="inline-flex items-center rounded-full bg-accent/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm shadow-md">
                {savingsPercent}% OFF
              </span>
            </div>
          )}
          {/* Wishlist Heart */}
          <button
            type="button"
            onClick={() => {
              if (!isLoggedIn) {
                requireAuth({ type: "wishlist" });
                return;
              }
              toggleWishlist(product.id);
            }}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm shadow-md hover:scale-110 active:scale-95 transition-all duration-200"
            aria-label={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
          >
            {isWishlisted(product.id) ? (
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-muted/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
          </button>
        </div>

        {/* Product Info */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight mb-2 flex items-center gap-3 flex-wrap">
            {product.name}
            {product.status === 'out_of_stock' && (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                🔴 Out of Stock
              </span>
            )}
            {product.status === 'coming_soon' && (
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                🟡 Coming Soon
              </span>
            )}
          </h1>
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getCategoryColor(product.category)}`}>
              {translatedCategory}
            </span>
            {companyName && (
              <span className="text-xs font-medium text-muted bg-surface px-2.5 py-0.5 rounded-full border border-card-border">
                {companyName}
              </span>
            )}
          </div>
          <p className="text-sm text-muted leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Variant Selector */}
        {hasVariants && variants.length > 1 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Select Variant</h3>
            <div className="flex flex-wrap gap-2">
              {variants.map((v, idx) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onVariantChange(idx)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    idx === selectedVariantIdx
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-surface text-muted border border-card-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Single variant display */}
        {hasVariants && variants.length === 1 && (
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted bg-surface px-3 py-1.5 rounded-lg border border-card-border">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              {variants[0].label}
            </span>
          </div>
        )}

        {/* Price Section */}
        {hasVariants && (
          <div className="rounded-2xl border border-card-border bg-card-bg p-4 sm:p-6 mb-6">
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-extrabold text-primary">₹{currentPrice}</span>
              <span className="text-sm text-muted">/unit</span>
              {savings > 0 && (
                <span className="text-base text-muted line-through">₹{unitPrice}</span>
              )}
            </div>
            {savings > 0 && (
              <span className="savings-badge">
                Save ₹{savings} per unit
              </span>
            )}
          </div>
        )}

        {/* Bulk Pricing */}
        {hasBulk && (
          <div className="mb-6">
            <BulkPricingSelector
              bulkPrices={sortedBulk}
              selectedIndex={selectedBulkIdx}
              onSelect={setSelectedBulkIdx}
              unitsPerBox={unitsPerBox}
              baseUnitPrice={unitPrice}
            />
          </div>
        )}

        {/* Order Summary / Total */}
        {hasVariants && (
          <div className="rounded-2xl border border-card-border bg-surface p-4 sm:p-6 mb-6">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Order Summary</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Boxes</span>
                <span className="font-semibold text-foreground">{currentBoxCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Units per box</span>
                <span className="font-semibold text-foreground">{unitsPerBox}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total units</span>
                <span className="font-semibold text-foreground">{totalUnits}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Price per unit</span>
                <span className="font-semibold text-primary">₹{currentPrice}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Total savings</span>
                  <span className="font-semibold text-primary">₹{(savings * totalUnits).toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="border-t border-card-border pt-3 mt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-muted uppercase tracking-wide">Total</span>
                  <span className="text-2xl font-extrabold text-primary">₹{totalPrice.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add to Cart / Buy Now Buttons */}
        {product.status === 'out_of_stock' ? (
          <div className="flex gap-3 mb-8">
            <button disabled className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-surface border-2 border-card-border px-4 py-4 text-base font-bold text-muted cursor-not-allowed">
              Currently Unavailable
            </button>
          </div>
        ) : product.status === 'coming_soon' ? (
          <div className="flex gap-3 mb-8">
            <button disabled className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-500/10 border-2 border-yellow-500/20 px-4 py-4 text-base font-bold text-yellow-700 dark:text-yellow-500 cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        ) : (
          <div className="mb-8 flex gap-3">
            <button
              onClick={async () => {
                if (!isLoggedIn) {
                  requireAuth({ type: "cart", productId: id, returnUrl: `/products/${id}` });
                  return;
                }
                if (user && !user.is_profile_complete) {
                  router.push("/account/setup");
                  return;
                }
                if (!activeVariant) return;
                setAddingToCart(true);
                const success = await addToCart({
                  product_id: product.id,
                  variant_id: activeVariant.id,
                  bulk_price_id: hasBulk ? sortedBulk[selectedBulkIdx].id : null,
                  box_count: currentBoxCount,
                });
                setAddingToCart(false);
                if (success) {
                  setAddedToCart(true);
                  setTimeout(() => setAddedToCart(false), 2000);
                }
              }}
              disabled={addingToCart || !hasVariants}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-primary-light px-4 py-4 text-base font-bold text-primary hover:bg-primary hover:text-white active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              {addingToCart ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : addedToCart ? (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Added!
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                  Add to Cart
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (!isLoggedIn) {
                  requireAuth({ type: "buy", productId: id, returnUrl: `/products/${id}` });
                  return;
                }
                if (user && !user.is_profile_complete) {
                  router.push("/account/setup");
                  return;
                }
                window.open(waUrl, "_blank");
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-4 text-base font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-hover hover:shadow-xl active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              Buy Now
              {hasVariants && (
                <span className="opacity-80">• ₹{totalPrice.toLocaleString("en-IN")}</span>
              )}
            </button>
          </div>
        )}

        {/* ═══════════ You May Also Like ═══════════ */}
        {recommended.length > 0 && (
          <section className="mt-4 mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground tracking-tight">You May Also Like</h2>
              <p className="text-xs text-muted mt-0.5">Similar products customers also buy</p>
            </div>

            <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
              {recommended.map((rec, idx) => (
                <RecommendedCard key={rec.id} product={rec} tag={getRandomTag(idx)} />
              ))}
            </div>
          </section>
        )}

        {loadingRec && !recommended.length && (
          <section className="mt-4 mb-8">
            <div className="mb-4">
              <div className="h-5 w-40 bg-surface rounded animate-shimmer" />
              <div className="h-3 w-56 bg-surface rounded animate-shimmer mt-2" />
            </div>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="shrink-0 w-[52vw] max-w-[200px] h-[220px] rounded-2xl bg-card-bg border border-card-border animate-shimmer" />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Bottom WhatsApp Button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-card-border bg-card-bg/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <button
            onClick={() => {
              if (!isLoggedIn) {
                requireAuth({ type: "order", productId: id, returnUrl: `/products/${id}` });
                return;
              }
              if (user && !user.is_profile_complete) {
                router.push("/account/setup");
                return;
              }
              window.open(waUrl, "_blank");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-whatsapp px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-whatsapp/25 hover:bg-whatsapp-hover hover:shadow-xl hover:shadow-whatsapp/30 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            {t("products_order_whatsapp")}
            {hasVariants && (
              <span className="ml-1 opacity-80">• ₹{totalPrice.toLocaleString("en-IN")}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ────────────────────────────────────────────
   Mini Recommended Product Card
   ──────────────────────────────────────────── */

function RecommendedCard({ product, tag }: { product: ProductWithVariants; tag: string }) {
  const { t } = useLanguage();
  const categoryKey = categoryKeyMap[product.category];
  const translatedCategory = categoryKey ? t(categoryKey) : product.category;

  const variants = product.product_variants || [];
  const defaultVariant = variants.length > 0
    ? variants.reduce((cheapest, v) => v.unit_price < cheapest.unit_price ? v : cheapest, variants[0])
    : null;

  const unitPrice = defaultVariant?.unit_price || 0;

  // Find best bulk price for savings teaser
  let bestBulkPrice = unitPrice;
  for (const v of variants) {
    for (const bp of v.bulk_prices || []) {
      if (bp.price_per_unit < bestBulkPrice) {
        bestBulkPrice = bp.price_per_unit;
      }
    }
  }
  const hasSavings = bestBulkPrice < unitPrice;
  const savingsAmount = unitPrice - bestBulkPrice;

  return (
    <Link
      href={`/products/${product.id}`}
      className="snap-start shrink-0 w-[52vw] max-w-[200px] group flex flex-col overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative h-[110px] w-full overflow-hidden bg-surface">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="200px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-8 w-8 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
        )}
        {/* Tag */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center rounded-full bg-foreground/70 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold text-white">
            {tag}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-2.5">
        <h4 className="text-xs font-semibold text-foreground leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {product.name}
        </h4>

        {defaultVariant && (
          <span className="text-[10px] text-muted mb-1">{defaultVariant.label}</span>
        )}

        <div className="flex items-baseline gap-1 mt-auto">
          <span className="text-sm font-extrabold text-primary">₹{unitPrice}</span>
          <span className="text-[9px] text-muted">/unit</span>
        </div>

        {hasSavings && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary bg-primary-light rounded-full px-1.5 py-0.5 mt-1 w-fit">
            Save ₹{savingsAmount}
          </span>
        )}
      </div>
    </Link>
  );
}
