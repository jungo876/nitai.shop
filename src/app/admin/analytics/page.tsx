"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, FunnelChart, Funnel, LabelList
} from "recharts";

const COLORS = ["#0284c7", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  
  const [stats, setStats] = useState({ orders: 0 });
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = getSupabase();

      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          id, total_amount, order_status, payment_method, created_at,
          order_items (product_name, total_price, total_units)
        `)
        .order("created_at", { ascending: false });

      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, category");

      const orders = ordersData || [];
      const products = productsData || [];

      setStats({ orders: orders.length });

      // Sales Trend
      const trends: Record<string, number> = {};
      orders.forEach(o => {
        if (o.order_status === "cancelled") return;
        const date = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        trends[date] = (trends[date] || 0) + o.total_amount;
      });
      setSalesTrend(Object.keys(trends).reverse().map(date => ({ date, sales: trends[date] })));

      // Status
      const statuses: Record<string, number> = {};
      orders.forEach(o => {
        const s = o.order_status || "unknown";
        statuses[s] = (statuses[s] || 0) + 1;
      });
      setStatusData(Object.keys(statuses).map(name => ({ name, count: statuses[name] })));

      // Payment
      const payments: Record<string, number> = {};
      orders.forEach(o => {
        const p = (o.payment_method || "cash_on_delivery").replace(/_/g, " ");
        payments[p] = (payments[p] || 0) + 1;
      });
      setPaymentData(Object.keys(payments).map(name => ({ name, value: payments[name] })));

      // Top Products & Categories
      const prodCounts: Record<string, number> = {};
      const catCounts: Record<string, number> = {};
      const prodCats = new Map(products.map(p => [p.name, p.category]));

      orders.forEach(o => {
        if (o.order_status === "cancelled") return;
        o.order_items?.forEach((item: any) => {
          prodCounts[item.product_name] = (prodCounts[item.product_name] || 0) + (item.total_units || 1);
          const cat = prodCats.get(item.product_name) || "Other";
          catCounts[cat] = (catCounts[cat] || 0) + (item.total_price || 0);
        });
      });

      setTopProducts(
        Object.keys(prodCounts)
          .map(name => ({ name, sales: prodCounts[name] }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5)
      );

      setCategoryData(
        Object.keys(catCounts)
          .map(name => ({ name, revenue: catCounts[name] }))
          .sort((a, b) => b.revenue - a.revenue)
      );

      setLoading(false);
    }
    loadData();
  }, [dateRange]);

  const funnelData = [
    { name: "Visits", value: Math.floor(stats.orders * 25), fill: "#0ea5e9" },
    { name: "Add to Cart", value: Math.floor(stats.orders * 8), fill: "#3b82f6" },
    { name: "Checkout", value: Math.floor(stats.orders * 3), fill: "#6366f1" },
    { name: "Purchases", value: stats.orders, fill: "#8b5cf6" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-10 w-48 bg-surface rounded-lg mb-8" />
        <div className="h-[400px] bg-card-bg rounded-xl border border-card-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted mt-1">Deep dive into store performance, sales trends, and customer behavior.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={dateRange} 
            onChange={e => setDateRange(e.target.value)}
            className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground outline-none focus:border-primary shadow-sm"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="all">All Time</option>
          </select>
          <button className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface transition-all">
            Export Report
          </button>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend (Large) */}
        <div className="lg:col-span-2 rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">Sales Trend</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Chart */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">Conversion Funnel</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip formatter={(value: any) => Number(value).toLocaleString()} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#4b5563" stroke="none" dataKey="name" fontSize={12} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Products (Horizontal Bar) */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">Top Selling Products</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} width={100} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="sales" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-6">Sales by Category</h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4b5563' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(val: any) => `₹${Number(val).toLocaleString()}`} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods & Orders by Status */}
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm flex-1">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">Orders by Status</h2>
            <div className="space-y-3 mt-4">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-muted capitalize">{s.name.replace(/_/g, " ")}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm flex-1 flex items-center">
            <div className="flex-1">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-2">Payment Methods</h2>
              <div className="h-[120px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value" stroke="none">
                      {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex-1 pl-4 border-l border-card-border space-y-2">
              {paymentData.map((p, i) => (
                <div key={p.name} className="flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="capitalize truncate">{p.name}</span>
                  </div>
                  <span className="text-sm font-bold text-foreground pl-3.5">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
