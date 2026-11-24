"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useStoreSettings, whatsappLink } from "@/context/SettingsContext";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import {
  formatOrderNumber,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
  REMAINING_METHOD_LABEL,
  type OrderStatus,
  type PaymentStatus,
  type RemainingPaymentMethod,
} from "@/lib/order-status";

interface OrderDetail {
  order: {
    id: string;
    order_number: number;
    total_amount: number;
    advance_amount: number;
    remaining_amount: number;
    payment_status: PaymentStatus;
    order_status: OrderStatus;
    payment_method: "prepaid" | "cod";
    remaining_payment_method: RemainingPaymentMethod | null;
    razorpay_payment_id: string | null;
    shipping_address: Record<string, string | null> | null;
    customer_snapshot: Record<string, string | null> | null;
    created_at: string;
    paid_at: string | null;
  };
  items: Array<{ id: string; product_id: string | null; product_name: string; variant_label: string; box_count: number; units_per_box: number; price_per_unit: number; total_units: number; total_price: number }>;
}

const STEPS: OrderStatus[] = ["placed", "confirmed", "processing", "shipped", "delivered"];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const justPlaced = useSearchParams().get("placed") === "1";
  const { isLoggedIn, isLoading: authLoading, requireAuth } = useAuth();
  const settings = useStoreSettings();
  const [data, setData] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    api<OrderDetail>(`/api/orders/${id}`).then((r) => {
      if (!active) return;
      if (r.ok && r.data) setData(r.data);
      else setError(r.status === 404 ? "Order not found." : r.error ?? "Could not load the order.");
    });
    return () => {
      active = false;
    };
  }, [id, isLoggedIn]);

  if (!authLoading && !isLoggedIn) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-bold text-foreground">Log in to view this order</h1>
        <button onClick={() => requireAuth({ type: "order", returnUrl: `/orders/${id}` })} className="mt-4 rounded-xl bg-primary px-8 py-3 font-bold text-white">Log in</button>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-foreground">{error}</p>
        <Link href="/orders" className="mt-4 text-sm font-semibold text-primary hover:underline">Back to My Orders</Link>
      </div>
    );
  }
  if (!data) {
    return <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-surface animate-shimmer" />)}</div>;
  }

  const { order, items } = data;
  const number = formatOrderNumber(order.order_number);
  const addr = order.shipping_address;
  const stepIndex = STEPS.indexOf(order.order_status);
  const help = whatsappLink(settings.whatsapp_number, `Hi, I have a question about my order ${number}.`);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground">← My Orders</Link>

        {justPlaced && (order.payment_status === "paid" || order.payment_status === "advance_paid") && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 dark:border-green-900/40 dark:bg-green-900/20" role="status">
            <p className="text-lg font-bold text-green-800 dark:text-green-300">Thank you! Your order is placed.</p>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              Order {number}. {order.payment_method === "cod" ? `Advance of ${formatINR(order.advance_amount)} received; pay ${formatINR(order.remaining_amount)} on delivery.` : `Payment of ${formatINR(order.advance_amount)} received.`}
            </p>
          </div>
        )}
        {justPlaced && order.payment_status === "pending" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/20" role="status">
            <p className="font-bold text-amber-800 dark:text-amber-300">We&apos;re confirming your payment</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">This usually takes under a minute. Refresh this page shortly.</p>
          </div>
        )}

        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">{number}</h1>
              <p className="text-xs text-muted mt-0.5">Placed {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_STYLE[order.order_status]}`}>{ORDER_STATUS_LABEL[order.order_status]}</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_STATUS_STYLE[order.payment_status]}`}>{PAYMENT_STATUS_LABEL[order.payment_status]}</span>
            </div>
          </div>

          {order.order_status !== "cancelled" && stepIndex >= 0 && (
            <ol className="mt-5 grid grid-cols-5 gap-1" aria-label="Order progress">
              {STEPS.map((s, i) => (
                <li key={s} className="text-center">
                  <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-card-border"}`} />
                  <span className={`mt-1.5 block text-[10px] sm:text-xs ${i <= stepIndex ? "font-semibold text-foreground" : "text-muted"}`}>{ORDER_STATUS_LABEL[s]}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Items</h2>
          <ul className="divide-y divide-card-border">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 py-3">
                <div className="min-w-0">
                  {it.product_id ? (
                    <Link href={`/products/${it.product_id}`} className="text-sm font-semibold text-foreground hover:text-primary">{it.product_name}</Link>
                  ) : (
                    <p className="text-sm font-semibold text-foreground">{it.product_name}</p>
                  )}
                  <p className="text-xs text-muted mt-0.5">
                    {it.variant_label} · {it.box_count} box{it.box_count === 1 ? "" : "es"} · {it.total_units} units @ {formatINR(it.price_per_unit)}
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground shrink-0">{formatINR(it.total_price)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-card-border bg-card-bg p-5 space-y-2 text-sm">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-1">Payment</h2>
          <Row label="Order total" value={formatINR(order.total_amount)} bold />
          <Row label={order.payment_method === "cod" ? "Advance paid online" : "Paid online"} value={formatINR(order.advance_amount)} />
          {order.remaining_amount > 0 && (
            <Row
              label={`Balance${order.remaining_payment_method ? ` (${REMAINING_METHOD_LABEL[order.remaining_payment_method]})` : ""}`}
              value={order.payment_status === "paid" ? "Paid" : formatINR(order.remaining_amount)}
            />
          )}
          {order.razorpay_payment_id && <Row label="Payment reference" value={order.razorpay_payment_id} mono />}
        </section>

        {addr && (
          <section className="rounded-2xl border border-card-border bg-card-bg p-5 text-sm">
            <h2 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Delivery address</h2>
            {order.customer_snapshot?.shop_name && <p className="font-semibold text-foreground">{order.customer_snapshot.shop_name}</p>}
            <p className="text-foreground">{addr.address_line}{addr.landmark ? `, ${addr.landmark}` : ""}</p>
            <p className="text-muted">{addr.city}, {addr.state} – {addr.pincode}</p>
          </section>
        )}

        {help && (
          <a href={help} target="_blank" rel="noopener noreferrer" className="block text-center rounded-2xl border border-card-border bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40">
            Need help with this order? Chat on WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`${bold ? "font-bold" : "font-semibold"} ${mono ? "font-mono text-xs" : ""} text-foreground text-right break-all`}>{value}</span>
    </div>
  );
}
