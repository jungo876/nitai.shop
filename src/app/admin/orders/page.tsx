"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { formatIndianMobile } from "@/lib/phone";
import {
  ADMIN_ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_STYLE,
  REMAINING_METHOD_LABEL,
  REMAINING_PAYMENT_METHODS,
  type OrderStatus,
  type PaymentStatus,
  type RemainingPaymentMethod,
} from "@/lib/order-status";

interface AdminOrder {
  id: string;
  order_number: number;
  order_number_display: string;
  total_amount: number;
  advance_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  payment_method: "prepaid" | "cod";
  remaining_payment_method: RemainingPaymentMethod | null;
  razorpay_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  admin_notes: string | null;
  is_new: boolean;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp: string;
  shop_name: string;
  gst_number: string;
  pan_number: string;
  address: Record<string, string | null> | null;
  items: Array<{ id: string; product_name: string; variant_label: string; box_count: number; total_units: number; price_per_unit: number; total_price: number }>;
}
interface ListResponse {
  orders: AdminOrder[];
  total: number;
  counts: { unseen: number; open: number; balance_due: number };
}

type FilterKey = "all" | "new" | "placed" | "processing" | "balance" | "paid" | "delivered" | "cancelled";
const FILTERS: Array<{ key: FilterKey; label: string; query: string }> = [
  { key: "all", label: "All", query: "" },
  { key: "new", label: "New", query: "unseen=true" },
  { key: "placed", label: "Placed", query: "status=placed" },
  { key: "processing", label: "Processing", query: "status=processing" },
  { key: "balance", label: "Balance due", query: "payment=advance_paid" },
  { key: "paid", label: "Fully paid", query: "payment=paid" },
  { key: "delivered", label: "Delivered", query: "status=delivered" },
  { key: "cancelled", label: "Cancelled", query: "status=cancelled" },
];
const PAGE = 50;

export default function AdminOrdersPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("search") ?? ""));
  const [query, setQuery] = useState(search);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const buildUrl = useCallback(
    (offset: number) => {
      const f = FILTERS.find((x) => x.key === filter)!;
      const parts = [f.query, `limit=${PAGE}`, `offset=${offset}`, query ? `search=${encodeURIComponent(query)}` : ""].filter(Boolean);
      return `/api/admin/orders?${parts.join("&")}`;
    },
    [filter, query]
  );

  useEffect(() => {
    let active = true;
    api<ListResponse>(buildUrl(0)).then((r) => {
      if (!active) return;
      if (r.ok && r.data) {
        setData(r.data);
        setError("");
      } else setError(r.error ?? "Could not load orders.");
    });
    return () => {
      active = false;
    };
  }, [buildUrl]);

  async function loadMore() {
    if (!data) return;
    setLoadingMore(true);
    const r = await api<ListResponse>(buildUrl(data.orders.length));
    setLoadingMore(false);
    if (r.ok && r.data) setData({ ...r.data, orders: [...data.orders, ...r.data.orders] });
  }

  function flash(type: "success" | "error", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  function replaceOrder(id: string, patch: Partial<AdminOrder>) {
    setData((d) => (d ? { ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) } : d));
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
  }

  async function openOrder(o: AdminOrder) {
    setSelected(o);
    if (o.is_new) {
      const r = await api("/api/admin/orders", { body: { ids: [o.id] } });
      if (r.ok) {
        replaceOrder(o.id, { is_new: false });
        setData((d) => (d ? { ...d, counts: { ...d.counts, unseen: Math.max(0, d.counts.unseen - 1) } } : d));
      }
    }
  }

  async function update(o: AdminOrder, patch: { order_status?: OrderStatus; payment_status?: PaymentStatus; remaining_payment_method?: RemainingPaymentMethod | null; admin_notes?: string | null }) {
    setSaving(true);
    const r = await api<{ order: Partial<AdminOrder> }>("/api/admin/orders", { method: "PATCH", body: { order_id: o.id, ...patch } });
    setSaving(false);
    if (!r.ok) {
      flash("error", r.error ?? "Update failed.");
      return false;
    }
    replaceOrder(o.id, { ...patch, ...(r.data?.order ?? {}), is_new: false } as Partial<AdminOrder>);
    flash("success", `Order ${o.order_number_display} updated.`);
    return true;
  }

  async function markAllSeen() {
    const r = await api<{ updated: number }>("/api/admin/orders", { body: { all: true } });
    if (r.ok) {
      setData((d) => (d ? { ...d, counts: { ...d.counts, unseen: 0 }, orders: d.orders.map((o) => ({ ...o, is_new: false })) } : d));
      flash("success", `${r.data?.updated ?? 0} order(s) marked as seen.`);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          {data && (
            <p className="text-sm text-muted mt-1">
              {data.counts.unseen} new · {data.counts.open} open · {data.counts.balance_due} with balance due
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {data && data.counts.unseen > 0 && (
            <button onClick={markAllSeen} className="rounded-lg border border-card-border bg-card-bg px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface">Mark all seen</button>
          )}
          <a href="/api/admin/export" className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary hover:text-white">Download CSV</a>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1" role="tablist" aria-label="Order filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f.key ? "bg-primary text-white" : "bg-surface text-muted border border-card-border hover:text-foreground"}`}
            >
              {f.label}
              {f.key === "new" && data && data.counts.unseen > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] text-white">{data.counts.unseen}</span>}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Order no., name, shop or phone"
          aria-label="Search orders"
          className="rounded-full border border-card-border bg-surface px-4 py-1.5 text-sm outline-none focus:border-primary sm:w-64"
        />
      </div>

      {msg && <p role="status" className={`rounded-lg px-4 py-3 text-sm font-medium ${msg.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{msg.text}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {!data && !error ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl bg-surface animate-pulse" />)}</div>
      ) : data && data.orders.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">No orders match.</p>
      ) : (
        <ul className="space-y-3">
          {data?.orders.map((o) => (
            <li key={o.id} className={`rounded-xl border bg-card-bg p-4 ${o.is_new ? "border-primary/50 shadow-sm" : "border-card-border"}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button type="button" onClick={() => openOrder(o)} className="flex-1 min-w-0 text-left">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-primary">{o.order_number_display}</span>
                    {o.is_new && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ORDER_STATUS_STYLE[o.order_status]}`}>{ORDER_STATUS_LABEL[o.order_status]}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_STATUS_STYLE[o.payment_status]}`}>{PAYMENT_STATUS_LABEL[o.payment_status]}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted">{o.payment_method === "cod" ? "COD" : "Prepaid"}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {o.customer_name} {o.shop_name && <span className="font-normal text-muted">· {o.shop_name}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {formatIndianMobile(o.customer_phone)} · {new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {o.address?.city ? ` · ${o.address.city}` : ""}
                  </p>
                </button>
                <div className="text-right shrink-0">
                  <p className="text-lg font-extrabold text-foreground">{formatINR(o.total_amount)}</p>
                  {o.payment_status === "advance_paid" && <p className="text-[11px] font-medium text-amber-700">Collect {formatINR(o.remaining_amount)}</p>}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {(o.order_status === "placed" || o.order_status === "confirmed" || o.order_status === "processing") && (
                    <button disabled={saving} onClick={() => update(o, { order_status: "shipped" })} className="rounded-lg bg-purple-100 px-2.5 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 disabled:opacity-50">Mark shipped</button>
                  )}
                  {o.order_status === "shipped" && (
                    <button disabled={saving} onClick={() => update(o, { order_status: "delivered" })} className="rounded-lg bg-green-100 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50">Mark delivered</button>
                  )}
                  {o.payment_status === "advance_paid" && (
                    <button disabled={saving} onClick={() => update(o, { payment_status: "paid" })} className="rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-200 disabled:opacity-50">Balance received</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.orders.length < data.total && (
        <div className="text-center">
          <button onClick={loadMore} disabled={loadingMore} className="rounded-xl border border-card-border bg-card-bg px-6 py-2.5 text-sm font-semibold hover:bg-surface disabled:opacity-50">
            {loadingMore ? "Loading…" : `Load more (${data.total - data.orders.length} left)`}
          </button>
        </div>
      )}

      {selected && <OrderDetail order={selected} saving={saving} onClose={() => setSelected(null)} onUpdate={(p) => update(selected, p)} />}
    </div>
  );
}

function OrderDetail({
  order,
  saving,
  onClose,
  onUpdate,
}: {
  order: AdminOrder;
  saving: boolean;
  onClose: () => void;
  onUpdate: (p: { order_status?: OrderStatus; payment_status?: PaymentStatus; remaining_payment_method?: RemainingPaymentMethod | null; admin_notes?: string | null }) => Promise<boolean>;
}) {
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const payOptions: PaymentStatus[] = order.payment_method === "cod" ? ["advance_paid", "paid", "refunded"] : ["paid", "refunded"];
  const a = order.address;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="order-title" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-card-border bg-card-bg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card-bg border-b border-card-border px-5 py-4 flex items-center justify-between">
          <h2 id="order-title" className="text-sm font-bold text-foreground">Order {order.order_number_display}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-foreground text-lg">✕</button>
        </div>
        <div className="px-5 py-5 space-y-5 text-sm">
          <section>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Customer</h3>
            <dl className="grid grid-cols-2 gap-2">
              <Info label="Name" value={order.customer_name} />
              <Info label="Phone" value={formatIndianMobile(order.customer_phone)} />
              {order.customer_whatsapp && <Info label="WhatsApp" value={formatIndianMobile(order.customer_whatsapp)} />}
              {order.shop_name && <Info label="Shop" value={order.shop_name} />}
              {order.gst_number && <Info label="GST" value={order.gst_number} />}
              {order.pan_number && <Info label="PAN" value={order.pan_number} />}
            </dl>
          </section>
          {a && (
            <section>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Delivery address</h3>
              <p className="text-foreground">{a.address_line}{a.landmark ? `, ${a.landmark}` : ""}</p>
              <p className="text-muted">{a.city}, {a.state} – {a.pincode}</p>
            </section>
          )}
          <section>
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Items ({order.items.length})</h3>
            <ul className="divide-y divide-card-border">
              {order.items.map((it) => (
                <li key={it.id} className="flex justify-between gap-3 py-2">
                  <div>
                    <p className="font-semibold text-foreground">{it.product_name}</p>
                    <p className="text-xs text-muted">{it.variant_label} · {it.box_count} box · {it.total_units} units @ {formatINR(it.price_per_unit)}</p>
                  </div>
                  <p className="font-bold text-foreground shrink-0">{formatINR(it.total_price)}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-1">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Payment</h3>
            <Line label="Total" value={formatINR(order.total_amount)} />
            <Line label={order.payment_method === "cod" ? "Advance paid online" : "Paid online"} value={formatINR(order.advance_amount)} />
            {order.remaining_amount > 0 && <Line label="Balance on delivery" value={formatINR(order.remaining_amount)} />}
            {order.razorpay_payment_id && <Line label="Razorpay payment" value={order.razorpay_payment_id} mono />}
          </section>
          <section className="border-t border-card-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-foreground mb-1 block">Order status</span>
              <select value={order.order_status} disabled={saving} onChange={(e) => onUpdate({ order_status: e.target.value as OrderStatus })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2">
                {ADMIN_ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-foreground mb-1 block">Payment status</span>
              <select value={order.payment_status} disabled={saving} onChange={(e) => onUpdate({ payment_status: e.target.value as PaymentStatus })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2">
                {payOptions.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            {order.payment_method === "cod" && (
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-foreground mb-1 block">Balance collected by</span>
                <select value={order.remaining_payment_method ?? ""} disabled={saving} onChange={(e) => onUpdate({ remaining_payment_method: (e.target.value || null) as RemainingPaymentMethod | null })} className="w-full rounded-lg border border-card-border bg-background px-3 py-2">
                  {REMAINING_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{REMAINING_METHOD_LABEL[m]}</option>)}
                </select>
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-foreground mb-1 block">Private notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} className="w-full rounded-lg border border-card-border bg-background px-3 py-2" placeholder="e.g. Courier, tracking number, delivery date" />
              <button disabled={saving || notes === (order.admin_notes ?? "")} onClick={() => onUpdate({ admin_notes: notes || null })} className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Save notes</button>
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold text-foreground ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
