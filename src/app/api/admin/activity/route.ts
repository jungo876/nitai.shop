import { json, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";

/** GET /api/admin/activity -> last 100 admin actions (audit trail) */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const rows = await db()`
    select l.id, l.action, l.entity_type, l.entity_id, l.metadata, l.created_at,
           u.name as admin_name, u.phone_number as admin_phone
    from admin_activity_logs l left join users u on u.id = l.admin_user_id
    order by l.created_at desc limit 100`;
  return json({ activity: rows });
});
