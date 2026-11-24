"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { formatIndianMobile } from "@/lib/phone";
import { formatOrderNumber, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus, type PaymentStatus } from "@/lib/order-status";
import { useAuth } from "@/context/AuthContext";

interface Customer {
  id: string;
  name: string | null;
  phone_number: string;
  is_admin: boolean;
  is_profile_complete: boolean;
  created_at: string;
  shop_name: string | null;
  gst_number: string | null;
  city: string | null;
  orders: number;
  total_spent: number;
}
interface Detail {
  customer: Customer & { whatsapp_number: string | null; pan_number: string | null; business_type: string | null; address_line: string | null; landmark: string | null; state: string | null; pincode: string | null; last_login_at: string | null };
  orders: Array<{ id: string; order_number: number; total_amount: number; order_status: OrderStatus; payment_status: PaymentStatus; created_at: string }>;
}

export default function CustomersPage() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{ customers: Customer[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let active = true;
    api<{ customers: Customer[]; total: number }>(`/api/admin/customers?limit=100${query ? `&search=${encodeURIComponent(query)}` : ""}`).then((r) => {
      if (!active) return;
      if (r.ok && r.data) setData(r.data);
      else setError(r.error ?? "Could not load customers.");
    });
    return () => {
      active = false;
    };
  }, [query, reload]);

  async function open(id: string) {
    const r = await api<Detail>(`/api/admin/customers/${id}`);
    if (r.ok && r.data) setDetail(r.data);
    else setMsg(r.error ?? "Could not load customer.");
  }

  async function toggleAdmin(c: Detail["customer"]) {
    const grant = !c.is_admin;
    if (!confirm(grant ? `Give ${c.name ?? c.phone_number} full ADMIN access (orders, products, customers)?` : `Remove admin access from ${c.name ?? c.phone_number}?`)) return;
    const r = await api(`/api/admin/customers/${c.id}`, { method: "PATCH", body: { is_admin: grant } });
    setMsg(r.ok ? (grant ? "Admin access granted. They need to log in again." : "Admin access removed.") : r.error ?? "Failed");
    if (r.ok) {
      setDetail(null);
      setReload((n) => n + 1);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted mt-1">{data ? `${data.total} account${data.total === 1 ? "" : "s"}` : "Loading…"}</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, shop, GST, city…"
          aria-label="Search customers"
          className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground outline-none focus:border-primary sm:w-80"
        />
      </div>

      {msg && <p role="status" className="rounded-lg bg-surface px-4 py-2 text-sm text-foreground">{msg}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-surface text-muted text-xs uppercase tracking-wider">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Customer</th>
              <th scope="col" className="px-5 py-3 font-semibold">Phone</th>
              <th scope="col" className="px-5 py-3 font-semibold">City</th>
              <th scope="col" className="px-5 py-3 font-semibold text-right">Orders</th>
              <th scope="col" className="px-5 py-3 font-semibold text-right">Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border">
            {!data ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">Loading…</td></tr>
            ) : data.customers.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">No customers found.</td></tr>
            ) : (
              data.customers.map((c) => (
                <tr key={c.id} className="hover:bg-surface/50 cursor-pointer" onClick={() => open(c.id)}>
                  <td className="px-5 py-3">
                    <button type="button" className="text-left" onClick={(e) => { e.stopPropagation(); open(c.id); }}>
                      <span className="font-semibold text-foreground">{c.name ?? "(no name yet)"}</span>
                      {c.is_admin && <span className="ml-2 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">ADMIN</span>}
                      {!c.is_profile_complete && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">INCOMPLETE</span>}
                      <span className="block text-xs text-muted">{c.shop_name ?? ""}</span>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-foreground">{formatIndianMobile(c.phone_number)}</td>
                  <td className="px-5 py-3 text-muted">{c.city ?? "—"}</td>
                  <td className="px-5 py-3 text-right font-semibold">{c.orders}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatINR(c.total_spent)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setDetail(null)}>
          <div role="dialog" aria-modal="true" aria-label="Customer details" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-card-bg border border-card-border p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">{detail.customer.name ?? "(no name yet)"}</h2>
                <p className="text-sm text-muted">{detail.customer.shop_name}</p>
              </div>
              <button onClick={() => setDetail(null)} aria-label="Close" className="text-muted hover:text-foreground text-xl">✕</button>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Phone" value={formatIndianMobile(detail.customer.phone_number)} />
              <Info label="WhatsApp" value={detail.customer.whatsapp_number ? formatIndianMobile(detail.customer.whatsapp_number) : "—"} />
              <Info label="GST" value={detail.customer.gst_number ?? "—"} />
              <Info label="PAN" value={detail.customer.pan_number ?? "—"} />
              <Info label="Business type" value={detail.customer.business_type ?? "—"} />
              <Info label="Joined" value={new Date(detail.customer.created_at).toLocaleDateString("en-IN")} />
              <div className="col-span-2">
                <Info label="Address" value={detail.customer.address_line ? `${detail.customer.address_line}${detail.customer.landmark ? ", " + detail.customer.landmark : ""}, ${detail.customer.city}, ${detail.customer.state} – ${detail.customer.pincode}` : "—"} />
              </div>
            </dl>
            <div>
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Orders ({detail.orders.length})</h3>
              {detail.orders.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : (
                <ul className="divide-y divide-card-border text-sm">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="flex justify-between py-2">
                      <span><span className="font-mono text-xs">{formatOrderNumber(o.order_number)}</span> · {new Date(o.created_at).toLocaleDateString("en-IN")}</span>
                      <span className="text-muted">{ORDER_STATUS_LABEL[o.order_status]} · {PAYMENT_STATUS_LABEL[o.payment_status]} · <b className="text-foreground">{formatINR(o.total_amount)}</b></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {detail.customer.id !== me?.id && (
              <button onClick={() => toggleAdmin(detail.customer)} className="w-full rounded-xl border border-card-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface">
                {detail.customer.is_admin ? "Remove admin access" : "Make admin"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium text-foreground break-words">{value}</dd>
    </div>
  );
}
