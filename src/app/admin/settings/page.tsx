"use client";

import { useEffect, useState } from "react";
import { api, fieldErrors } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { formatIndianMobile } from "@/lib/phone";

interface Settings {
  store_name: string;
  support_phone: string | null;
  whatsapp_number: string | null;
  support_email: string | null;
  business_address: string | null;
  store_status: "open" | "closed";
  closed_message: string | null;
  cod_enabled: boolean;
  cod_advance_percent: number;
  min_order_amount: number;
  updated_at: string;
}
interface Activity {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  admin_name: string | null;
  admin_phone: string | null;
}

const ic = "w-full rounded-xl border border-card-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/50 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [s, setS] = useState<Settings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    let active = true;
    api<Settings>("/api/admin/settings").then((r) => active && r.ok && r.data && setS(r.data));
    api<{ activity: Activity[] }>("/api/admin/activity").then((r) => active && r.ok && setActivity(r.data?.activity ?? []));
    return () => {
      active = false;
    };
  }, []);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((prev) => (prev ? { ...prev, [key]: value } : prev));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    setMsg(null);
    const r = await api<Settings>("/api/admin/settings", {
      method: "PUT",
      body: {
        store_name: s.store_name,
        support_phone: s.support_phone || null,
        whatsapp_number: s.whatsapp_number || null,
        support_email: s.support_email || "",
        business_address: s.business_address || null,
        store_status: s.store_status,
        closed_message: s.closed_message || null,
        cod_enabled: s.cod_enabled,
        cod_advance_percent: Number(s.cod_advance_percent),
        min_order_amount: Number(s.min_order_amount) || 0,
      },
    });
    setSaving(false);
    if (r.ok && r.data) {
      setS(r.data);
      setMsg({ type: "success", text: "Settings saved. Changes apply to the website immediately." });
    } else {
      setErrors(fieldErrors(r.details));
      setMsg({ type: "error", text: r.error ?? "Could not save settings." });
    }
  }

  if (!s) return <div className="h-96 max-w-4xl mx-auto rounded-2xl bg-card-bg border border-card-border animate-pulse" />;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Store settings</h1>
        <p className="text-sm text-muted mt-1">Last saved {new Date(s.updated_at).toLocaleString("en-IN")}</p>
      </div>

      {msg && <p role="status" className={`rounded-xl px-4 py-3 text-sm font-medium border ${msg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>{msg.text}</p>}

      <form onSubmit={save} className="space-y-6" noValidate>
        <Section title="Store status" desc="Close the store to stop new orders (customers can still browse).">
          <div className="flex gap-3">
            {(["open", "closed"] as const).map((v) => (
              <label key={v} className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-sm font-semibold ${s.store_status === v ? (v === "open" ? "border-green-500 bg-green-50 text-green-800" : "border-red-500 bg-red-50 text-red-800") : "border-card-border text-muted"}`}>
                <input type="radio" name="store_status" value={v} checked={s.store_status === v} onChange={() => set("store_status", v)} className="sr-only" />
                {v === "open" ? "Open — taking orders" : "Closed — no new orders"}
              </label>
            ))}
          </div>
          {s.store_status === "closed" && (
            <Field label="Message shown to customers" error={errors.closed_message}>
              <input className={ic} value={s.closed_message ?? ""} onChange={(e) => set("closed_message", e.target.value)} placeholder="e.g. Closed for Durga Puja, back on 15 Oct" maxLength={300} />
            </Field>
          )}
        </Section>

        <Section title="Payments" desc="Customers can always pay 100% online. Cash on delivery needs an online advance.">
          <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <input type="checkbox" checked={s.cod_enabled} onChange={(e) => set("cod_enabled", e.target.checked)} className="h-5 w-5 accent-primary" />
            Offer cash on delivery
          </label>
          {s.cod_enabled && (
            <Field label="Advance to pay online for COD (%)" error={errors.cod_advance_percent}>
              <input type="number" min={1} max={100} className={ic} value={s.cod_advance_percent} onChange={(e) => set("cod_advance_percent", Number(e.target.value))} />
            </Field>
          )}
          <Field label="Minimum order value (₹, 0 = none)" error={errors.min_order_amount}>
            <input type="number" min={0} className={ic} value={s.min_order_amount} onChange={(e) => set("min_order_amount", Number(e.target.value))} />
          </Field>
        </Section>

        <Section title="Contact details" desc="Shown on the website (WhatsApp buttons, footer, contact page).">
          <Field label="Store name" error={errors.store_name}>
            <input className={ic} value={s.store_name} onChange={(e) => set("store_name", e.target.value)} maxLength={80} />
          </Field>
          <Field label="WhatsApp number" error={errors.whatsapp_number}>
            <input className={ic} inputMode="tel" value={s.whatsapp_number ?? ""} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="10-digit mobile" />
          </Field>
          <Field label="Support phone" error={errors.support_phone}>
            <input className={ic} inputMode="tel" value={s.support_phone ?? ""} onChange={(e) => set("support_phone", e.target.value)} placeholder="10-digit mobile" />
          </Field>
          <Field label="Support email" error={errors.support_email}>
            <input className={ic} type="email" value={s.support_email ?? ""} onChange={(e) => set("support_email", e.target.value)} placeholder="support@nitai.shop" />
          </Field>
          <Field label="Business address" error={errors.business_address}>
            <textarea className={ic} rows={3} value={s.business_address ?? ""} onChange={(e) => set("business_address", e.target.value)} placeholder="Shown on the Contact page and policies" maxLength={500} />
          </Field>
        </Section>

        <button type="submit" disabled={saving} className="rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>

      <Section title="Your admin account" desc="Admins log in with their phone number and a one-time code.">
        <p className="text-sm text-foreground"><b>{user?.name ?? "—"}</b> · {formatIndianMobile(user?.phone_number)}</p>
        <p className="text-xs text-muted">To add or remove another admin, open them on the Customers page.</p>
      </Section>

      <Section title="Recent admin activity" desc="Last 100 changes made in the admin panel.">
        {activity.length === 0 ? (
          <p className="text-sm text-muted">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-card-border text-sm max-h-80 overflow-y-auto">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-3 py-2">
                <span className="text-foreground">{a.action} <span className="text-muted">({a.entity_type})</span></span>
                <span className="text-xs text-muted shrink-0">{a.admin_name ?? formatIndianMobile(a.admin_phone)} · {new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted mt-1">{desc}</p>
      </div>
      <div className="md:col-span-2 rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm space-y-4">{children}</div>
    </section>
  );
}
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-foreground mb-1.5">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
