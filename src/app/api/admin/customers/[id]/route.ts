import { z } from "zod";
import { assertUuid, badRequest, json, notFound, readJson, route } from "@/server/http";
import { destroyAllSessions, requireAdmin } from "@/server/auth/session";
import { getCustomer } from "@/server/admin/customers";
import { db } from "@/server/db";
import { logAdminAction } from "@/server/audit";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/customers/:id -> profile + order history */
export const GET = route<Ctx>(async (req, { params }) => {
  await requireAdmin(req);
  const found = await getCustomer(assertUuid((await params).id, "customer id"));
  if (!found) throw notFound("Customer not found.");
  return json(found);
});

/** PATCH /api/admin/customers/:id { is_admin } -> grant/revoke admin access */
export const PATCH = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = assertUuid((await params).id, "customer id");
  const { is_admin } = await readJson(req, z.object({ is_admin: z.boolean() }));
  if (id === admin.id && !is_admin) throw badRequest("You cannot remove your own admin access.");
  const r = await db()`update users set is_admin = ${is_admin} where id = ${id}`;
  if (r.count === 0) throw notFound("Customer not found.");
  // Force a fresh login so the change takes effect everywhere.
  if (id !== admin.id) await destroyAllSessions(id);
  await logAdminAction(admin.id, is_admin ? "Admin Granted" : "Admin Revoked", "User", id);
  return json({ success: true });
});
