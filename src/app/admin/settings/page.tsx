"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  
  const [whatsappNumber, setWhatsappNumber] = useState("919876543210");
  const [supportEmail, setSupportEmail] = useState("support@nckagro.com");
  const [storeStatus, setStoreStatus] = useState("active");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{type: "success"|"error", text: string} | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    
    // Simulate API call
    setTimeout(() => {
      setSaving(false);
      setMsg({ type: "success", text: "Settings saved successfully!" });
    }, 800);
  }

  const ic = "w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Store Settings</h1>
        <p className="text-sm text-muted mt-1">Manage your storefront configuration and admin profile.</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${msg.type === "success" ? "bg-green-50 dark:bg-green-900/20 text-green-700 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 border-red-200 dark:border-red-800"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <h2 className="text-lg font-bold text-foreground">General Configuration</h2>
          <p className="text-sm text-muted mt-1">Update contact details visible to customers.</p>
        </div>
        
        <div className="md:col-span-2 rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">WhatsApp Support Number</label>
              <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} className={ic} placeholder="91..." />
              <p className="text-xs text-muted mt-1.5">Include country code. This is used for the support button.</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Support Email</label>
              <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} className={ic} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Store Status</label>
              <select value={storeStatus} onChange={e => setStoreStatus(e.target.value)} className={`${ic} appearance-none cursor-pointer`}>
                <option value="active">Active (Taking Orders)</option>
                <option value="maintenance">Maintenance Mode</option>
                <option value="closed">Closed Temporarily</option>
              </select>
            </div>

            <div className="pt-4 border-t border-card-border">
              <button type="submit" disabled={saving} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-card-border">
        <div className="md:col-span-1">
          <h2 className="text-lg font-bold text-foreground">Admin Profile</h2>
          <p className="text-sm text-muted mt-1">Your personal admin account details.</p>
        </div>
        
        <div className="md:col-span-2 rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Name</label>
              <input type="text" value={user?.name || ""} disabled className={`${ic} opacity-70 bg-surface`} />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Phone Number</label>
              <input type="text" value={user?.phone_number || ""} disabled className={`${ic} opacity-70 bg-surface`} />
              <p className="text-xs text-muted mt-1.5">Phone numbers cannot be changed. Contact superadmin if needed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
