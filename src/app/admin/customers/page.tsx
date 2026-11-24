"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export default function CustomersPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      // In a real scenario we might compute total spend here, or use an RPC
      const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      setCustomers(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted mt-1">Manage your customer accounts, order history, and contact details.</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search customers..." className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm text-foreground outline-none focus:border-primary shadow-sm" />
          <button className="rounded-lg border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-surface transition-all">
            Filter
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-card-border">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" /></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted">No customers found.</td></tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold shadow-sm">
                          {c.name ? c.name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{c.name || "Unknown User"}</p>
                          <p className="text-xs text-muted">Joined {new Date(c.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{c.phone_number}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        c.is_admin ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                      }`}>
                        {c.is_admin ? "Admin" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-primary hover:text-primary-dark font-medium text-sm">View Profile</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
