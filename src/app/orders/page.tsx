"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function statusColor(s: string) {
  const m: Record<string, string> = { placed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", confirmed: "bg-emerald-100 text-emerald-700", processing: "bg-amber-100 text-amber-700", shipped: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
  return m[s] || "bg-gray-100 text-gray-700";
}
function payColor(s: string) {
  const m: Record<string, string> = { pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", advance_paid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", fully_paid: "bg-green-100 text-green-700", failed: "bg-red-100 text-red-700" };
  return m[s] || "bg-gray-100 text-gray-700";
}
function payLabel(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

export default function OrdersPage() {
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !isLoggedIn) router.replace("/"); }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    async function load() {
      if (!isLoggedIn) return;
      try {
        const res = await fetch("/api/orders");
        if (res.ok) { const d = await res.json(); setOrders(d.orders || []); }
      } catch { /* silent */ } finally { setLoading(false); }
    }
    load();
  }, [isLoggedIn]);

  if (authLoading || (isLoggedIn && loading)) return (
    <div className="min-h-screen bg-background"><div className="mx-auto max-w-3xl px-4 py-12 space-y-4">{[1,2,3].map(i=><div key={i} className="h-24 bg-surface animate-shimmer rounded-2xl" />)}</div></div>
  );

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link href="/account" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>Account
          </Link>
          <span className="text-xs font-semibold text-foreground tracking-wider uppercase">My Orders</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-6">My Orders</h1>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-20 w-20 bg-surface rounded-full flex items-center justify-center mb-5">
              <svg className="h-10 w-10 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No orders yet</h2>
            <p className="text-muted text-sm mb-6">Start shopping to see your orders here.</p>
            <Link href="/" className="rounded-xl bg-gradient-to-r from-gradient-start to-gradient-end px-8 py-3 text-sm font-bold text-white shadow-lg">Browse Products</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o: any) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="block rounded-2xl border border-card-border bg-card-bg p-4 sm:p-5 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-mono text-muted">#{o.id.slice(0, 8).toUpperCase()}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColor(o.order_status)}`}>{o.order_status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-extrabold text-foreground">₹{Number(o.total_amount).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted mt-1">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right space-y-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${payColor(o.payment_status)}`}>{payLabel(o.payment_status)}</span>
                    <p className="text-[10px] font-medium text-muted capitalize">{o.payment_method === "cash_on_delivery" ? "COD" : "Razorpay"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
