"use client";
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

function statusColor(s: string) {
  const m: Record<string, string> = { placed: "bg-blue-100 text-blue-700", confirmed: "bg-emerald-100 text-emerald-700", processing: "bg-amber-100 text-amber-700", shipped: "bg-purple-100 text-purple-700", delivered: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700" };
  return m[s] || "bg-gray-100 text-gray-700";
}
function payColor(s: string) {
  const m: Record<string, string> = { pending: "bg-amber-100 text-amber-700", advance_paid: "bg-blue-100 text-blue-700", paid: "bg-green-100 text-green-700", failed: "bg-red-100 text-red-700", cancelled: "bg-red-100 text-red-700" };
  return m[s] || "bg-gray-100 text-gray-700";
}
function payLabel(s: string) { return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }
function payIcon(s: string) {
  if (s === "paid") return "🟢";
  if (s === "advance_paid") return "🟡";
  if (s === "failed" || s === "cancelled") return "🔴";
  return "🟠";
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !isLoggedIn) router.replace("/"); }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    async function load() {
      if (!isLoggedIn) return;
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) { const d = await res.json(); setOrder(d.order); setItems(d.items || []); }
      } catch { /* silent */ } finally { setLoading(false); }
    }
    load();
  }, [isLoggedIn, id]);

  if (authLoading || loading) return (
    <div className="min-h-screen bg-background"><div className="mx-auto max-w-3xl px-4 py-12 space-y-4">{[1,2,3].map(i=><div key={i} className="h-20 bg-surface animate-shimmer rounded-2xl" />)}</div></div>
  );

  if (!order) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <h2 className="text-xl font-bold text-foreground mb-2">Order not found</h2>
      <Link href="/orders" className="text-primary text-sm font-semibold hover:underline mt-4">View All Orders</Link>
    </div>
  );

  const totalAmount = Number(order.total_amount);
  const paidAmount = Number(order.advance_amount);
  const remainingAmount = Number(order.remaining_amount);
  const isPrepaid = order.payment_method === "prepaid";

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="border-b border-card-border bg-card-bg/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>Orders
          </Link>
          <span className="text-xs font-semibold text-foreground tracking-wider uppercase">Order Details</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        {/* Success banner */}
        <div className="rounded-2xl bg-primary p-5 text-white text-center">
          <svg className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
          <h2 className="text-lg font-bold">Order Placed Successfully!</h2>
          <p className="text-sm text-white/80 mt-1">Order ID: {order.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Payment Badge */}
        <section className="rounded-2xl border-2 border-card-border bg-card-bg p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{payIcon(order.payment_status)}</span>
            <div>
              <p className="text-sm font-bold text-foreground">{payLabel(order.payment_status)}</p>
              {isPrepaid ? (
                <p className="text-xs text-muted">Full payment of ₹{totalAmount.toLocaleString("en-IN")} received.</p>
              ) : (
                <p className="text-xs text-muted">
                  Advance of ₹{paidAmount.toLocaleString("en-IN")} received.
                  {remainingAmount > 0 && ` Remaining ₹${remainingAmount.toLocaleString("en-IN")} payable on delivery.`}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Order Status</h3>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColor(order.order_status)}`}>{order.order_status}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted mb-0.5">Payment Method</p>
              <p className="font-semibold text-foreground capitalize">{isPrepaid ? "Prepaid (Full)" : "COD (10% Advance)"}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-0.5">Payment Status</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${payColor(order.payment_status)}`}>{payLabel(order.payment_status)}</span>
            </div>
          </div>
        </section>

        {/* Payment Details */}
        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Payment Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted">Order Total</span><span className="font-bold text-foreground">₹{totalAmount.toLocaleString("en-IN")}</span></div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{isPrepaid ? "Amount Paid" : "Advance Paid (10%)"}</span>
              <span className="font-bold text-primary">₹{paidAmount.toLocaleString("en-IN")}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted">Remaining on Delivery</span>
                <span className="font-semibold text-foreground">₹{remainingAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>
        </section>

        {/* Items */}
        <section className="rounded-2xl border border-card-border bg-card-bg p-5">
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Items ({items.length})</h3>
          <div className="space-y-3">
            {items.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start py-2 border-b border-card-border last:border-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.product_name}</p>
                  <p className="text-xs text-muted">{item.variant_label} • {item.box_count} Box{item.box_count > 1 ? "es" : ""}</p>
                  <p className="text-xs text-muted">{item.total_units} units @ ₹{Number(item.price_per_unit)}/unit</p>
                </div>
                <p className="text-sm font-bold text-primary">₹{Number(item.total_price).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Date */}
        <p className="text-center text-xs text-muted">Ordered on {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
    </div>
  );
}
