import { assertUuid, badRequest, json, notFound, readJson, route } from "@/server/http";
import { requireAdmin } from "@/server/auth/session";
import { db } from "@/server/db";
import { logAdminAction } from "@/server/audit";
import { bannerUpdateSchema } from "@/lib/validations/product";

type Ctx = { params: Promise<{ id: string }> };

/** PUT /api/banners/:id (admin) — partial update */
export const PUT = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = assertUuid((await params).id, "banner id");
  const u = await readJson(req, bannerUpdateSchema);
  const fields = Object.fromEntries(Object.entries(u).filter(([, v]) => v !== undefined));
  if (!Object.keys(fields).length) throw badRequest("Nothing to update.");
  const sql = db();
  const [row] = await sql`
    update homepage_banners set ${sql(fields)} where id = ${id}
    returning id, title, image_url, redirect_url, display_order, is_active, created_at`;
  if (!row) throw notFound("Banner not found.");
  await logAdminAction(admin.id, "Banner Updated", "Banner", id, fields);
  return json(row);
});

/** DELETE /api/banners/:id (admin) */
export const DELETE = route<Ctx>(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const id = assertUuid((await params).id, "banner id");
  const r = await db()`delete from homepage_banners where id = ${id}`;
  if (r.count === 0) throw notFound("Banner not found.");
  await logAdminAction(admin.id, "Banner Deleted", "Banner", id);
  return json({ success: true });
});
