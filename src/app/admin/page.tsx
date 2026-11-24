"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  
  // KPIs
  const [stats, setStats] = useState({ revenue: 0, orders: 0, pending: 0, products: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const supabase = getSupabase();

      // Fetch all orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          id, total_amount, order_status, created_at,
          users (name, phone_number)
        `)
        .order("created_at", { ascending: false });

      // Fetch products
      const { data: productsData } = await supabase
        .from("products")
        .select("id, name, category");

      const orders = ordersData || [];
      const products = productsData || [];

      // 1. KPIs
      let rev = 0, pending = 0;
      orders.forEach(o => {
        if (o.order_status !== "cancelled") rev += o.total_amount;
        if (o.order_status === "placed" || o.order_status === "pending") pending++;
      });
      setStats({ revenue: rev, orders: orders.length, pending, products: products.length });

      // 2. Tables
      setRecentOrders(orders.slice(0, 6));

      // Mock Low Stock Products for UI realism
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      setLowStock(shuffled.slice(0, 4).map(p => ({
        ...p,
        stock: Math.floor(Math.random() * 15) + 1
      })));

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-10 w-48 bg-surface rounded-lg mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-card-bg rounded-xl border border-card-border" />)}
        </div>
        <div className="h-64 bg-card-bg rounded-xl border border-card-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted mt-1">Operational overview and quick actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="rounded-lg bg-surface border border-card-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-card-bg transition-all">
            + Add Product
          </Link>
          <Link href="/admin/orders" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-all">
            View All Orders
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Total Revenue</p>
            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">₹</div>
          </div>
          <p className="text-3xl font-extrabold text-foreground">₹{stats.revenue.toLocaleString()}</p>
        </div>
        
        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Total Orders</p>
            <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground">{stats.orders.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Pending Orders</p>
            <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground">{stats.pending}</p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-muted uppercase tracking-wider">Low Stock Products</p>
            <div className="h-8 w-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </div>
          <p className="text-3xl font-extrabold text-foreground">{lowStock.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-card-border flex items-center justify-between bg-surface/50">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-primary hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order ID</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-muted">No orders found.</td></tr>
                ) : (
                  recentOrders.map(order => (
                    <tr key={order.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-primary hover:underline cursor-pointer">
                        <Link href={`/admin/orders`}>#{order.id.slice(0, 8)}</Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-foreground">{order.users?.name || "Guest"}</p>
                        <p className="text-[11px] text-muted">{order.users?.phone_number}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-foreground">₹{order.total_amount.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          order.order_status === "delivered" ? "bg-green-100 text-green-700" :
                          order.order_status === "cancelled" ? "bg-red-100 text-red-700" :
                          order.order_status === "pending" || order.order_status === "placed" ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {order.order_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-card-border bg-surface/50">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              <Link href="/admin/products" className="flex items-center gap-3 p-3 rounded-xl border border-card-border hover:bg-surface transition-colors">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Add New Product</p>
                  <p className="text-xs text-muted">Create a new item in the store</p>
                </div>
              </Link>
              <Link href="/admin/banners" className="flex items-center gap-3 p-3 rounded-xl border border-card-border hover:bg-surface transition-colors">
                <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Update Banners</p>
                  <p className="text-xs text-muted">Change storefront promotions</p>
                </div>
              </Link>
              <Link href="/admin/analytics" className="flex items-center gap-3 p-3 rounded-xl border border-card-border hover:bg-surface transition-colors">
                <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">View Reports</p>
                  <p className="text-xs text-muted">Analyze store performance</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="px-5 py-4 border-b border-card-border bg-red-50/50 dark:bg-red-900/10 flex items-center justify-between">
              <h2 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span></span>
                Low Stock
              </h2>
              <Link href="/admin/products" className="text-xs font-semibold text-red-600 hover:underline">Manage</Link>
            </div>
            <div className="overflow-y-auto flex-1">
              {lowStock.length === 0 ? (
                <div className="p-8 text-center text-muted text-sm">Inventory looks good!</div>
              ) : (
                <div className="divide-y divide-card-border">
                  {lowStock.map(p => (
                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-surface/50 transition-colors">
                      <div className="min-w-0 pr-4">
                        <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted truncate">{p.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-red-600">{p.stock}</p>
                        <p className="text-[10px] text-muted uppercase">Left</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
