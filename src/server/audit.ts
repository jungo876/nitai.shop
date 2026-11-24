import "server-only";
import { db, type Queryable } from "./db";
import { log } from "./logger";

/** Records an admin action in admin_activity_logs. Never throws. */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown> | null,
  sql: Queryable = db()
) {
  try {
    await sql`
      insert into admin_activity_logs (admin_user_id, action, entity_type, entity_id, metadata)
      values (${adminUserId}, ${action}, ${entityType}, ${entityId ?? null}, ${metadata ? sql.json(metadata as never) : null})`;
  } catch (err) {
    log.error("admin_audit_log_failed", { action, entityType, err });
  }
}
