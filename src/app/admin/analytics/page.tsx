"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

const COLORS = ["#16a34a", "#0284c7", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

interface Analytics {
  daily: Array<{ date: string; sales: number; orders: number }>;
  by_status: Array<{ name: OrderStatus; count: number }>;
  by_method: Array<{ name: "prepaid" | "cod"; value: number }>;
  top_products: Array<{ name: string; units: number; revenue: number }>;
  by_category: Array<{ name: string; revenue: number }>;
}

const RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "365", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

const inr = (v: unknown) => formatINR(Number(v));
const shortInr = (v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`);

export default function AnalyticsPage() {
  const [range, setRange] = useState("30");
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<Analytics>(`/api/admin/analytics?range=${range}`).then((r) => {
      if (!active) return;
      if (r.ok && r.data) {
        setData(r.data);
        setError("");
      } else setError(r.error ?? "Could not load analytics.");
    });
    return () => {
      active = false;
    };
  }, [range]);

  const totalSales = data?.daily.reduce((s, d) => s + Number(d.sales), 0) ?? 0;
  const totalOrders = data?.daily.reduce((s, d) => s + Number(d.orders), 0) ?? 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted mt-1">Based on paid orders (cancelled orders excluded).</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only">Date range</span>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground">
            {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <div className="h-[400px] rounded-2xl bg-card-bg border border-card-border animate-pulse" />}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Sales" value={formatINR(totalSales)} />
            <Kpi label="Orders" value={String(totalOrders)} />
            <Kpi label="Average order" value={formatINR(totalOrders ? Math.round(totalSales / totalOrders) : 0)} />
            <Kpi label="COD share" value={`${pct(data.by_method.find((m) => m.name === "cod")?.value, data.by_method.reduce((s, m) => s + Number(m.value), 0))}%`} />
          </div>

          <Card title="Sales trend">
            {data.daily.length === 0 ? <Empty /> : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily.map((d) => ({ ...d, sales: Number(d.sales) }))} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <YAxis tickFormatter={shortInr} tick={{ fontSize: 12, fill: "#6b7280" }} width={60} />
                    <Tooltip formatter={(v) => [inr(v), "Sales"]} />
                    <Area type="monotone" dataKey="sales" stroke="#16a34a" strokeWidth={2} fill="#16a34a" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Top products (revenue)">
              {data.top_products.length === 0 ? <Empty /> : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.top_products.map((p) => ({ ...p, revenue: Number(p.revenue) }))} layout="vertical" margin={{ left: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "#4b5563" }} />
                      <Tooltip formatter={(v) => inr(v)} />
                      <Bar dataKey="revenue" fill="#16a34a" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Sales by category">
              {data.by_category.length === 0 ? <Empty /> : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.by_category.map((c) => ({ ...c, revenue: Number(c.revenue) }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#4b5563" }} />
                      <YAxis tickFormatter={shortInr} width={55} tick={{ fontSize: 11, fill: "#4b5563" }} />
                      <Tooltip formatter={(v) => inr(v)} />
                      <Bar dataKey="revenue" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Payment method & order status">
              {data.by_method.length === 0 ? <Empty /> : (
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.by_method.map((m) => ({ name: m.name === "cod" ? "Cash on delivery" : "Prepaid", value: Number(m.value) }))} dataKey="value" innerRadius={35} outerRadius={55} paddingAngle={4}>
                        {data.by_method.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              <ul className="mt-3 space-y-1.5 text-sm">
                {data.by_status.map((s) => (
                  <li key={s.name} className="flex justify-between">
                    <span className="text-muted">{ORDER_STATUS_LABEL[s.name] ?? s.name}</span>
                    <span className="font-semibold text-foreground">{s.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function pct(part: number | undefined, total: number) {
  return total ? Math.round(((Number(part) || 0) / total) * 100) : 0;
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
      <p className="text-xs font-bold text-muted uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
      <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">{title}</h2>
      {children}
    </section>
  );
}
function Empty() {
  return <p className="py-10 text-center text-sm text-muted">No sales in this period yet.</p>;
}
