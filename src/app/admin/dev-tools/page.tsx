"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

type ActionType = "clear_orders" | "clear_cart" | "clear_wishlist" | "clear_payments" | "reset_demo_data" | null;

export default function DevToolsPage() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const isAuth = isLoggedIn && user?.is_admin === true;

  const [confirmAction, setConfirmAction] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  if (authLoading) return <div className="p-8">Loading...</div>;
  if (!isAuth) return <div className="p-8">Access Denied</div>;

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-red-600">Disabled</h1>
        <p className="mt-2 text-muted">Development tools are disabled in the production environment.</p>
      </div>
    );
  }

  async function executeAction(action: ActionType) {
    if (!action) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dev/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to execute action");

      setMsg({ type: "success", text: data.message || "Action completed successfully." });
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setLoading(false);
      setConfirmAction(null);
      setTimeout(() => setMsg(null), 5000);
    }
  }

  function ActionCard({ title, desc, actionKey, btnText, confirmText }: { title: string, desc: string, actionKey: ActionType, btnText: string, confirmText: string }) {
    return (
      <div className="rounded-2xl border border-card-border bg-card-bg p-5 sm:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-1">{title}</h2>
        <p className="text-sm text-muted mb-5">{desc}</p>
        
        {confirmAction === actionKey ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
            <h4 className="text-sm font-bold text-red-800 dark:text-red-400 mb-1">Confirm Action</h4>
            <p className="text-xs text-red-600 dark:text-red-400/80 mb-3">{confirmText}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setConfirmAction(null)} 
                disabled={loading}
                className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => executeAction(actionKey)} 
                disabled={loading}
                className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Working..." : btnText}
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setConfirmAction(actionKey)}
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {btnText}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            Development Tools
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-500">
              DEV ONLY
            </span>
          </h1>
          <p className="text-sm text-muted mt-1">
            Dangerous actions to help with testing. These tools are completely disabled in production.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-sm ${msg.type === "success" ? "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/30 dark:text-red-400"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <ActionCard 
          title="Clear All Orders" 
          desc="Permanently deletes all orders and their associated order items from the database." 
          actionKey="clear_orders" 
          btnText="Clear All Orders" 
          confirmText="Are you sure you want to delete ALL orders? This action cannot be undone." 
        />
        
        <ActionCard 
          title="Clear Entire Cart" 
          desc="Removes all items from every user's shopping cart." 
          actionKey="clear_cart" 
          btnText="Clear All Carts" 
          confirmText="Are you sure you want to delete all cart items for all users?" 
        />

        <ActionCard 
          title="Clear Wishlists" 
          desc="Removes all saved items from every user's wishlist." 
          actionKey="clear_wishlist" 
          btnText="Clear Wishlists" 
          confirmText="Are you sure you want to clear all wishlists?" 
        />

        <ActionCard 
          title="Clear Payments" 
          desc="Resets the payment status for all existing orders back to 'pending'. This does NOT delete the orders themselves." 
          actionKey="clear_payments" 
          btnText="Reset Payments" 
          confirmText="Are you sure you want to reset all payment statuses to 'pending'?" 
        />

        <div className="md:col-span-2">
          <ActionCard 
            title="Reset Demo Data (Full Reset)" 
            desc="The nuclear option. Permanently deletes all orders, all cart items, and all wishlists in one go. Does NOT delete your products." 
            actionKey="reset_demo_data" 
            btnText="Reset All Test Data" 
            confirmText="Are you absolutely sure you want to wipe all test data (Orders, Carts, Wishlists)? Products and users will remain." 
          />
        </div>
      </div>
    </div>
  );
}
