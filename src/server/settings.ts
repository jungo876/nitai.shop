import "server-only";
import { db, type Queryable } from "./db";
import { env } from "./env";

export interface StoreSettings {
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

export async function getStoreSettings(sql: Queryable = db()): Promise<StoreSettings> {
  const [s] = await sql`
    select store_name, support_phone, whatsapp_number, support_email, business_address, store_status,
           closed_message, cod_enabled, cod_advance_percent, min_order_amount, updated_at
    from store_settings where id = 1`;
  const fallbackWhatsapp = env().NEXT_PUBLIC_WHATSAPP_NUMBER ?? null;
  if (!s) {
    return {
      store_name: "NCK Agro", support_phone: null, whatsapp_number: fallbackWhatsapp, support_email: null,
      business_address: null, store_status: "open", closed_message: null, cod_enabled: true,
      cod_advance_percent: 10, min_order_amount: 0, updated_at: new Date(0).toISOString(),
    };
  }
  return {
    ...(s as unknown as StoreSettings),
    whatsapp_number: s.whatsapp_number ?? fallbackWhatsapp,
    updated_at: s.updated_at instanceof Date ? s.updated_at.toISOString() : String(s.updated_at),
  };
}

/** Fields safe to show every visitor. */
export function publicSettings(s: StoreSettings) {
  return {
    store_name: s.store_name,
    support_phone: s.support_phone,
    whatsapp_number: s.whatsapp_number,
    support_email: s.support_email,
    business_address: s.business_address,
    store_status: s.store_status,
    closed_message: s.closed_message,
    cod_enabled: s.cod_enabled,
    cod_advance_percent: s.cod_advance_percent,
    min_order_amount: s.min_order_amount,
  };
}
