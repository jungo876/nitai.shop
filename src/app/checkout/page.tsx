"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";

type PaymentMethod = "prepaid" | "cod";

interface CheckoutItem {
  cart_item_id: string;
  product_id: string;
  variant_id: string;
  bulk_price_id: string | null;
  product_name: string;
  product_image: string;
  variant_label: string;
  box_count: number;
  quantity: number;
  units_per_box: number;
  price_per_unit: number;
  total_units: number;
  total_price: number;
}

interface CheckoutData {
  user: {
    id: string;
    name: string;
    phone_number: string;
    whatsapp_number: string | null;
  };
  business_profile: {
    shop_name: string | null;
    gst_number: string | null;
    pan_number: string | null;
    business_type: string | null;
  } | null;
  address: {
    address_line: string | null;
    landmark: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    phone_number: string | null;
  } | null;
  items: (CheckoutItem & { id: string; available: boolean })[];
  subtotal: number;
  item_count: number;
  has_unavailable: boolean;
  settings: { store_status: "open" | "closed"; closed_message: string | null; cod_enabled: boolean; cod_advance_percent: number; min_order_amount: number };
}

interface CreatedPayment {
  order_id: string;
  order_number: string;
  razorpay_order_id: string;
  key_id: string;
  amount_paise: number;
  currency: string;
  description: string;
  prefill: { name: string; contact: string };
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay?: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading, user } = useAuth();
  const { refreshCart } = useCart();

  const [data, setData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("prepaid");

  // Derived amounts
  const subtotal = data?.subtotal || 0;
  const codPercent = data?.settings.cod_advance_percent ?? 10;
  const payNow = paymentMethod === "prepaid" ? subtotal : Math.round(subtotal * codPercent) / 100;
  const remaining = Math.round((subtotal - payNow) * 100) / 100;
  const [payError, setPayError] = useState("");
  const [confirming, setConfirming] = useState<CreatedPayment | null>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace("/");
    }
  }, [authLoading, isLoggedIn, router]);

  // Profile guard
  useEffect(() => {
    if (!authLoading && user && !user.is_profile_complete) {
      router.replace("/account/setup");
    }
  }, [authLoading, user, router]);

  // Fetch the server-calculated checkout summary
  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    api<CheckoutData>("/api/checkout/summary").then((r) => {
      if (!active) return;
      if (r.ok && r.data) {
        setData(r.data);
        if (!r.data.settings.cod_enabled) setPaymentMethod("prepaid");
        if (r.data.items.length === 0) router.replace("/cart");
      } else {
        setError(r.error ?? "Failed to load checkout");
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isLoggedIn, router]);

  /** Step 2: ask the server to verify the payment with Razorpay and confirm the order. */
  const confirmOrder = useCallback(
    async (created: CreatedPayment, response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
      setConfirming(created);
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await api<{ order_id: string }>("/api/payment/verify", { body: response });
        if (r.ok) {
          await refreshCart();
          router.push(`/orders/${created.order_id}?placed=1`);
          return;
        }
        if (r.status > 0 && r.status < 500) {
          setConfirming(null);
          setPaying(false);
          setPayError(`${r.error} If money was deducted, it will be refunded automatically or confirmed shortly — check My Orders or contact us with order ${created.order_number}.`);
          return;
        }
        await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
      }
      // Network trouble: the Razorpay webhook will still confirm a real payment.
      await refreshCart();
      router.push(`/orders/${created.order_id}?placed=1`);
    },
    [refreshCart, router]
  );

  /** Step 1: create a pending order on the server, then open Razorpay for exactly that amount. */
  const handlePlaceOrder = useCallback(async () => {
    if (!data || !razorpayReady || !window.Razorpay) return;
    setPaying(true);
    setPayError("");
    const r = await api<CreatedPayment>("/api/payment/create-order", { body: { payment_method: paymentMethod } });
    if (!r.ok || !r.data) {
      setPaying(false);
      if (r.redirect) {
        router.push(r.redirect);
        return;
      }
      setPayError(r.error ?? "Could not start the payment.");
      return;
    }
    const created = r.data;
    const rzp = new window.Razorpay({
      key: created.key_id,
      amount: created.amount_paise,
      currency: created.currency,
      name: "NCK Agro",
      description: created.description,
      order_id: created.razorpay_order_id,
      prefill: created.prefill,
      notes: { order_number: created.order_number },
      theme: { color: "#16a34a" },
      handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => confirmOrder(created, response),
      modal: { ondismiss: () => setPaying(false), confirm_close: true },
    });
    rzp.on("payment.failed", (resp: { error?: { description?: string } }) => {
      setPayError(`Payment failed: ${resp.error?.description ?? "please try again"}. No money was taken for this attempt.`);
      setPaying(false);
    });
    rzp.open();
  }, [data, razorpayReady, paymentMethod, router, confirmOrder]);

  // Loading skeleton
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
          <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
            <div className="h-6 w-16 bg-surface animate-shimmer rounded" />
            <div className="h-5 w-24 bg-surface animate-shimmer rounded" />
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-card-border bg-card-bg p-5 space-y-3 animate-shimmer">
              <div className="h-4 w-32 bg-surface rounded" />
              <div className="h-4 w-full bg-surface rounded" />
              <div className="h-4 w-2/3 bg-surface rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface mb-6">
          <svg className="h-10 w-10 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Checkout Error</h2>
        <p className="text-muted text-sm mb-6">{error || "Unable to load checkout."}</p>
        <Link
          href="/cart"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          Back to Cart
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-56">
      {confirming && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/95 px-6 text-center" role="status" aria-live="polite">
          <svg className="h-10 w-10 animate-spin text-primary mb-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          <p className="text-lg font-bold text-foreground">Confirming your payment…</p>
          <p className="text-sm text-muted mt-1">Order {confirming.order_number}. Please don&apos;t close this page.</p>
        </div>
      )}
      {/* Razorpay Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setRazorpayReady(true)}
        onError={() => setPayError("Could not load the payment window. Check your internet connection and refresh.")}
      />
      {/* Header */}
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link href="/cart" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Cart
          </Link>
          <span className="text-xs font-semibold text-foreground tracking-wider uppercase">
            Checkout
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Review &amp; Confirm
        </h1>

        {/* ═══════════ 1. SHIPPING ADDRESS ═══════════ */}
        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              Shipping Address
            </h3>
            <Link href="/account/setup" className="text-xs font-semibold text-primary hover:underline">
              Edit
            </Link>
          </div>
          {data.address ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{data.address.address_line}</p>
              {data.address.landmark && (
                <p className="text-xs text-muted">Landmark: {data.address.landmark}</p>
              )}
              <p className="text-sm text-muted">
                {data.address.city}, {data.address.state} — {data.address.pincode}
              </p>
              {data.address.phone_number && (
                <p className="text-xs text-muted mt-1">Phone: {data.address.phone_number}</p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted mb-3">No shipping address on file.</p>
              <Link
                href="/account/setup"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Add Address →
              </Link>
            </div>
          )}
        </section>

        {/* ═══════════ 2. SHOP DETAILS ═══════════ */}
        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
              </svg>
              Shop Details
            </h3>
            <Link href="/account/setup" className="text-xs font-semibold text-primary hover:underline">
              Edit
            </Link>
          </div>
          {data.business_profile ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{data.business_profile.shop_name || "—"}</p>
              {data.business_profile.business_type && (
                <span className="inline-flex items-center text-xs font-medium text-muted bg-surface px-2 py-0.5 rounded-full border border-card-border capitalize">
                  {data.business_profile.business_type}
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">No business details added.</p>
          )}
        </section>

        {/* ═══════════ 3. GST / PAN DETAILS ═══════════ */}
        {data.business_profile && (data.business_profile.gst_number || data.business_profile.pan_number) && (
          <section className="rounded-2xl border border-card-border bg-card-bg p-5">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Tax Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {data.business_profile.gst_number && (
                <div>
                  <p className="text-[11px] text-muted uppercase tracking-wide mb-0.5">GST No.</p>
                  <p className="text-sm font-mono font-semibold text-foreground">{data.business_profile.gst_number}</p>
                </div>
              )}
              {data.business_profile.pan_number && (
                <div>
                  <p className="text-[11px] text-muted uppercase tracking-wide mb-0.5">PAN No.</p>
                  <p className="text-sm font-mono font-semibold text-foreground">{data.business_profile.pan_number}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════ 4. ORDER ITEMS ═══════════ */}
        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-4">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            Order Summary ({data.item_count} {data.item_count === 1 ? "item" : "items"})
          </h3>

          <div className="space-y-4">
            {data.items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-surface shrink-0">
                  {item.product_image ? (
                    <Image src={item.product_image} alt={item.product_name} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg className="h-6 w-6 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{item.product_name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {item.variant_label} • {item.box_count} Box{item.box_count > 1 ? "es" : ""}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted">
                      {item.total_units} units @ ₹{item.price_per_unit}/unit
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {formatINR(item.total_price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ 5. PAYMENT METHOD SELECTION ═══════════ */}
        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5 mb-4">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
            Payment Method
          </h3>

          <div className="space-y-3">
            {/* PREPAID OPTION */}
            <button
              type="button"
              onClick={() => setPaymentMethod("prepaid")}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                paymentMethod === "prepaid"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-card-border hover:border-muted"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 ${paymentMethod === "prepaid" ? "border-primary" : "border-muted/40"}`}>
                  {paymentMethod === "prepaid" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                    <span className="text-sm font-bold text-foreground">Prepaid</span>
                  </div>
                  <p className="text-xs text-muted mt-1.5 ml-7">Pay the full order amount now.</p>
                  <div className="mt-2.5 ml-7 space-y-1">
                    <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      Faster processing
                    </p>
                    <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      Priority dispatch
                    </p>
                    <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      No payment during delivery
                    </p>
                  </div>
                </div>
              </div>
            </button>

            {/* COD OPTION */}
            {data.settings.cod_enabled && (
            <button
              type="button"
              onClick={() => setPaymentMethod("cod")}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                paymentMethod === "cod"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-card-border hover:border-muted"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 ${paymentMethod === "cod" ? "border-primary" : "border-muted/40"}`}>
                  {paymentMethod === "cod" && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <span className="text-sm font-bold text-foreground">Cash on Delivery</span>
                  </div>
                  <p className="text-xs text-muted mt-1.5 ml-7">Pay only {codPercent}% now to confirm your order. Pay the remaining {100 - codPercent}% on delivery.</p>
                  <div className="mt-2.5 ml-7 space-y-1">
                    <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      Lower upfront payment
                    </p>
                    <p className="text-[11px] text-primary font-medium flex items-center gap-1.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                      Order confirmation after advance payment
                    </p>
                  </div>
                </div>
              </div>
            </button>
            )}
          </div>

          {/* Info box */}
          <div className={`mt-4 rounded-lg p-3 text-xs font-medium ${paymentMethod === "prepaid" ? "bg-primary/5 text-primary border border-primary/20" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
            {paymentMethod === "prepaid"
              ? "Your order will be processed immediately after successful payment."
              : `To confirm your order, a ${codPercent}% advance payment is required. The remaining balance is paid on delivery.`
            }
          </div>
        </section>

        {/* ═══════════ 6. PAYMENT SUMMARY ═══════════ */}
        <section className="rounded-2xl border border-card-border bg-surface p-5">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Payment Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted font-medium">Order Total</span>
              <span className="font-bold text-foreground">{formatINR(subtotal)}</span>
            </div>
            <div className="border-t border-card-border my-1" />
            <div className="flex justify-between text-sm">
              <span className="text-foreground font-semibold">
                Pay Now {paymentMethod === "cod" && <span className="text-xs text-muted font-normal">({codPercent}% advance)</span>}
              </span>
              <span className="text-lg font-extrabold text-primary">{formatINR(payNow)}</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted font-medium">
                  Remaining on Delivery <span className="text-xs">({100 - codPercent}%)</span>
                </span>
                <span className="font-semibold text-foreground">{formatINR(remaining)}</span>
              </div>
            )}
            <div className="border-t border-card-border my-1" />
            <div className="flex justify-between text-xs">
              <span className="text-muted">Payment Method</span>
              <span className="font-semibold text-foreground capitalize">{paymentMethod === "prepaid" ? "Prepaid (Full)" : `COD (${codPercent}% advance)`}</span>
            </div>
          </div>
        </section>

        {/* ═══════════ 7. TRUST BADGES ═══════════ */}
        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light"><svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></div><div><p className="text-xs font-bold text-foreground">Secure Payment</p><p className="text-[11px] text-muted leading-snug mt-0.5">Powered by Razorpay.</p></div></div>
            <div className="flex items-start gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light"><svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg></div><div><p className="text-xs font-bold text-foreground">GST Details</p><p className="text-[11px] text-muted leading-snug mt-0.5">Your GST number is saved with every order.</p></div></div>
            <div className="flex items-start gap-2.5"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light"><svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg></div><div><p className="text-xs font-bold text-foreground">Trusted B2B</p><p className="text-[11px] text-muted leading-snug mt-0.5">Confirmed with Razorpay payment.</p></div></div>
          </div>
        </section>
      </div>

      {/* ═══════════ STICKY CTA ═══════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-card-border bg-card-bg/95 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted font-medium">
                {paymentMethod === "prepaid" ? "Full Payment" : `Advance (${codPercent}%)`}
              </p>
              <p className="text-xl font-extrabold text-primary">{formatINR(payNow)}</p>
            </div>
            {remaining > 0 && (
              <p className="text-xs text-muted text-right">
                Remaining: {formatINR(remaining)}<br />
                <span className="text-[10px]">payable on delivery</span>
              </p>
            )}
          </div>
          {data.settings.store_status === "closed" && (
            <p role="alert" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              {data.settings.closed_message || "We are not taking orders right now. Please try again later."}
            </p>
          )}
          {data.has_unavailable && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
              Some items are no longer available. <Link href="/cart" className="underline font-semibold">Review your cart</Link>.
            </p>
          )}
          {payError && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">{payError}</p>
          )}
          <button onClick={handlePlaceOrder} disabled={paying || !razorpayReady || data.settings.store_status === "closed" || data.has_unavailable || !data.address} className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-bold text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {paying ? (<><svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Processing...</>) : (<><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>Pay {formatINR(payNow)} Securely</>)}
          </button>
          <p className="text-center text-[11px] text-muted mt-2">{razorpayReady ? "Powered by Razorpay • Secure Payment" : "Loading secure payment…"}</p>
        </div>
      </div>
    </div>
  );
}
