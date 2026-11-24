"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import {
  formatOrderNumber,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/order-status";

interface OrderRow {
  id: string;
  order_number: number;
  total_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  payment_method: string;
  created_at: string;
  item_count: number;
}

export default function OrdersPage() {
  const { isLoggedIn, isLoading: authLoading, requireAuth } = useAuth();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    api<{ orders: OrderRow[] }>("/api/orders").then((r) => {
      if (!active) return;
      if (r.ok) setOrders(r.data?.orders ?? []);
      else setError(r.error ?? "Could not load your orders.");
    });
    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  if (!authLoading && !isLoggedIn) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Log in to see your orders</h1>
        <button onClick={() => requireAuth({ type: "order", returnUrl: "/orders" })} className="mt-4 rounded-xl bg-primary px-8 py-3 font-bold text-white">
          Log in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">My Orders</h1>

        {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {!orders && !error ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-surface animate-shimmer" />)}
          </div>
        ) : orders && orders.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-card-border bg-surface">
            <p className="font-semibold text-foreground">No orders yet</p>
            <p className="text-sm text-muted mt-1 mb-6">When you place an order it will appear here.</p>
            <Link href="/products" className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white">Browse products</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders?.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="block rounded-2xl border border-card-border bg-card-bg p-4 hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground">{formatOrderNumber(o.order_number)}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.item_count} item{o.item_count === 1 ? "" : "s"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ORDER_STATUS_STYLE[o.order_status]}`}>{ORDER_STATUS_LABEL[o.order_status]}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PAYMENT_STATUS_STYLE[o.payment_status]}`}>{PAYMENT_STATUS_LABEL[o.payment_status]}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-extrabold text-foreground">{formatINR(o.total_amount)}</p>
                      {o.remaining_amount > 0 && o.payment_status === "advance_paid" && (
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">{formatINR(o.remaining_amount)} due on delivery</p>
                      )}
                    </div>
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
