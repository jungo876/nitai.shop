"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useStoreSettings } from "@/context/SettingsContext";
import { formatINR } from "@/lib/money";

export default function CartPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading, requireAuth } = useAuth();
  const { items, count, isLoading, subtotal, has_unavailable, updateQuantity, removeItem } = useCart();
  const settings = useStoreSettings();
  const [actionError, setActionError] = useState<string | null>(null);

  async function changeQty(id: string, qty: number) {
    setActionError(await updateQuantity(id, qty));
  }
  async function remove(id: string) {
    setActionError(await removeItem(id));
  }

  if (!authLoading && !isLoggedIn) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Log in to see your cart</h1>
        <p className="text-muted text-sm mb-8 max-w-xs">Your cart is saved to your account, so you can continue on any device.</p>
        <button
          onClick={() => requireAuth({ type: "cart", returnUrl: "/cart" })}
          className="rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all"
        >
          Log in
        </button>
      </div>
    );
  }

  // Loading
  if (authLoading || (isLoggedIn && isLoading)) {
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

  // Empty cart
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
            <svg className="h-12 w-12 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Your cart is empty</h2>
          <p className="text-muted text-sm mb-8 max-w-xs">
            Browse our products and add items to your cart.
          </p>
          <Link
            href="/"
            className="rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-52">
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
            Cart ({count})
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">
          Your Cart
          <span className="text-muted text-base font-normal ml-2">({count} {count === 1 ? "item" : "items"})</span>
        </h1>

        {/* Cart Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-card-border bg-card-bg p-4 sm:p-5"
            >
              <div className="flex gap-4">
                {/* Product Image */}
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

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product_id}`}>
                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors">
                      {item.product_name}
                    </h3>
                  </Link>
                  <p className="text-xs text-muted mt-1">
                    {item.variant_label} • {item.box_count} Box{item.box_count > 1 ? "es" : ""}
                  </p>
                  {item.available === false && (
                    <p className="mt-1.5 inline-flex rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {item.unavailable_reason ?? "Unavailable"} — please remove
                    </p>
                  )}

                  {/* Unit details */}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{item.units_per_box} units/box</span>
                    <span>{item.total_units} total units</span>
                    <span>₹{item.price_per_unit}/unit</span>
                  </div>

                  {/* Price */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-primary">
                      {formatINR(item.total_price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Controls + Remove */}
              <div className="mt-4 flex items-center justify-between border-t border-card-border pt-3">
                {/* Quantity */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted mr-2">Qty:</span>
                  <button
                    onClick={() => {
                      if (item.quantity > 1) {
                        changeQty(item.id, item.quantity - 1);
                      }
                    }}
                    disabled={item.quantity <= 1}
                    aria-label={`Decrease quantity of ${item.product_name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-surface text-foreground text-sm font-bold hover:bg-card-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => changeQty(item.id, item.quantity + 1)}
                    disabled={item.quantity >= 1000}
                    aria-label={`Increase quantity of ${item.product_name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-surface text-foreground text-sm font-bold hover:bg-card-border transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => remove(item.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Summary */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-card-border bg-card-bg/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          {/* Summary */}
          {actionError && <p role="alert" className="mb-3 text-sm font-medium text-red-600">{actionError}</p>}
          {has_unavailable && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
              Some items are no longer available. Remove them to continue.
            </p>
          )}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted font-medium">Order total</span>
              <span className="text-lg font-extrabold text-foreground">{formatINR(subtotal)}</span>
            </div>
            <p className="text-xs text-muted">
              Pay in full online, {settings.cod_enabled ? `or pay just ${settings.cod_advance_percent}% now (${formatINR(Math.round(subtotal * settings.cod_advance_percent) / 100)}) and the rest on delivery.` : "at checkout."}
            </p>
          </div>

          {/* Proceed to Checkout */}
          <button
            onClick={() => router.push("/checkout")}
            disabled={has_unavailable || items.length === 0}
            className="disabled:opacity-50 disabled:cursor-not-allowed w-full rounded-2xl bg-primary px-6 py-3.5 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            Proceed to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
