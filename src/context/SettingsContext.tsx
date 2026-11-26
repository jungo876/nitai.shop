"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api-client";

/** Public store settings (from the admin Settings page), loaded once per visit. */
export interface PublicSettings {
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
}

const DEFAULTS: PublicSettings = {
  store_name: "NCK Agro",
  support_phone: null,
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? null,
  support_email: null,
  business_address: null,
  store_status: "open",
  closed_message: null,
  cod_enabled: true,
  cod_advance_percent: 10,
  min_order_amount: 0,
};

const SettingsContext = createContext<PublicSettings>(DEFAULTS);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULTS);
  useEffect(() => {
    let active = true;
    api<PublicSettings>("/api/settings").then((r) => {
      if (active && r.ok && r.data) setSettings({ ...DEFAULTS, ...r.data });
    });
    return () => {
      active = false;
    };
  }, []);
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useStoreSettings() {
  return useContext(SettingsContext);
}

/** wa.me link with the Indian country code; null if no number is configured. */
export function whatsappLink(number: string | null | undefined, text?: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
