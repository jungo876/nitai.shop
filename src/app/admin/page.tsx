"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

interface Stats {
  kpis: {
    order_value: number;
    collected_online: number;
    balance_due: number;
    orders: number;
    orders_today: number;
    open_orders: number;
    unseen_orders: number;
    products: number;
    out_of_stock: number;
    hidden: number;
    without_price: number;
    customers: number;
    new_customers: number;
  };
  recent_orders: Array<{
    id: string;
    order_number: number;
    total_amount: number;
    order_status: OrderStatus;
    payment_status: PaymentStatus;
    created_at: string;
    admin_seen_at: string | null;
    customer_name: string | null;
    shop_name: string | null;
  }>;
  attention_products: Array<{ id: string; name: string; issue: string }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<Stats>("/api/admin/stats").then((r) => {
      if (!active) return;
      if (r.ok && r.data) setStats(r.data);
      else setError(r.error ?? "Could not load the dashboard.");
    });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!stats) {
    return (
      <div className="space-y-6 p-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-card-bg border border-card-border animate-pulse" />)}
        </div>
        <div className="h-64 rounded-2xl bg-card-bg border border-card-border animate-pulse" />
      </div>
    );
  }

  const k = stats.kpis;
  const cards = [
    { label: "Sales (order value)", value: formatINR(k.order_value), hint: `${k.orders} paid orders` },
    { label: "Collected online", value: formatINR(k.collected_online), hint: "Prepaid + COD advances" },
    { label: "Balance to collect", value: formatINR(k.balance_due), hint: "COD amounts due on delivery" },
    { label: "Open orders", value: String(k.open_orders), hint: `${k.orders_today} new today`, href: "/admin/orders" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted mt-1">Your store at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="rounded-lg bg-surface border border-card-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-card-bg">+ Add product</Link>
          <Link href="/admin/orders" className="relative rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">
            Orders
            {k.unseen_orders > 0 && (
              <span className="ml-2 rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-primary">{k.unseen_orders} new</span>
            )}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const inner = (
            <>
              <p className="text-xs font-bold text-muted uppercase tracking-wider">{c.label}</p>
              <p className="mt-3 text-2xl font-extrabold text-foreground">{c.value}</p>
              <p className="mt-1 text-xs text-muted">{c.hint}</p>
            </>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm hover:shadow-md">{inner}</Link>
          ) : (
            <div key={c.label} className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">{inner}</div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-primary hover:underline">View all</Link>
          </div>
          {stats.recent_orders.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">No orders yet. Paid orders will appear here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface text-muted text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Order</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Amount</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {stats.recent_orders.map((o) => (
                    <tr key={o.id} className="hover:bg-surface/50">
                      <td className="px-5 py-3">
                        <Link href={`/admin/orders?search=${o.order_number}`} className="font-mono text-xs text-primary hover:underline">{formatOrderNumber(o.order_number)}</Link>
                        {!o.admin_seen_at && <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                        <p className="text-[11px] text-muted">{new Date(o.created_at).toLocaleDateString("en-IN")}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-foreground">{o.customer_name ?? "—"}</p>
                        <p className="text-[11px] text-muted">{o.shop_name}</p>
                      </td>
                      <td className="px-5 py-3 font-bold text-foreground">{formatINR(o.total_amount)}</td>
                      <td className="px-5 py-3 space-x-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ORDER_STATUS_STYLE[o.order_status]}`}>{ORDER_STATUS_LABEL[o.order_status]}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PAYMENT_STATUS_STYLE[o.payment_status]}`}>{PAYMENT_STATUS_LABEL[o.payment_status]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Catalogue</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Products" value={k.products} />
              <Stat label="Out of stock" value={k.out_of_stock} />
              <Stat label="Hidden" value={k.hidden} />
              <Stat label="Customers" value={k.customers} hint={`${k.new_customers} new in 30 days`} />
            </dl>
          </section>

          <section className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-card-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Needs attention</h2>
              <Link href="/admin/products" className="text-xs font-semibold text-primary hover:underline">Manage</Link>
            </div>
            {stats.attention_products.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">All products look good.</p>
            ) : (
              <ul className="divide-y divide-card-border">
                {stats.attention_products.map((p) => (
                  <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{p.issue}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xl font-extrabold text-foreground">{value}</dd>
      {hint && <dd className="text-[11px] text-muted">{hint}</dd>}
    </div>
  );
}
