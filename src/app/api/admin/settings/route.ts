import { json, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { getStoreSettings } from "@/server/settings";
import { logAdminAction } from "@/server/audit";
import { storeSettingsSchema } from "@/lib/validations/settings";

/** GET /api/admin/settings */
export const GET = route(async (req) => {
  await requireAdmin(req);
  return json(await getStoreSettings());
});

/** PUT /api/admin/settings */
export const PUT = route(async (req) => {
  const admin = await requireAdmin(req);
  const s = await readJson(req, storeSettingsSchema);
  await db()`
    insert into store_settings (id, store_name, support_phone, whatsapp_number, support_email, business_address,
                                store_status, closed_message, cod_enabled, cod_advance_percent, min_order_amount, updated_by)
    values (1, ${s.store_name}, ${s.support_phone}, ${s.whatsapp_number}, ${s.support_email ?? null}, ${s.business_address},
            ${s.store_status}, ${s.closed_message}, ${s.cod_enabled}, ${s.cod_advance_percent}, ${s.min_order_amount}, ${admin.id})
    on conflict (id) do update set
      store_name = excluded.store_name, support_phone = excluded.support_phone, whatsapp_number = excluded.whatsapp_number,
      support_email = excluded.support_email, business_address = excluded.business_address,
      store_status = excluded.store_status, closed_message = excluded.closed_message, cod_enabled = excluded.cod_enabled,
      cod_advance_percent = excluded.cod_advance_percent, min_order_amount = excluded.min_order_amount,
      updated_by = excluded.updated_by`;
  await logAdminAction(admin.id, "Settings Updated", "Settings", "1", { store_status: s.store_status, cod_enabled: s.cod_enabled, cod_advance_percent: s.cod_advance_percent });
  return json(await getStoreSettings());
});
