import { json, readJson, route } from "@/server/http";
import { getCurrentUser, requireAdmin } from "@/server/auth/session";
import { listBanners } from "@/server/catalog";
import { db } from "@/server/db";
import { logAdminAction } from "@/server/audit";
import { bannerSchema } from "@/lib/validations/product";

/** GET /api/banners (active only; ?all=true for admins) */
export const GET = route(async (req) => {
  const all = req.nextUrl.searchParams.get("all") === "true" && (await getCurrentUser(req))?.is_admin === true;
  return json(await listBanners(all));
});

/** POST /api/banners (admin) */
export const POST = route(async (req) => {
  const admin = await requireAdmin(req);
  const b = await readJson(req, bannerSchema);
  const [row] = await db()`
    insert into homepage_banners (title, image_url, redirect_url, display_order, is_active)
    values (${b.title}, ${b.image_url}, ${b.redirect_url}, ${b.display_order}, ${b.is_active})
    returning id, title, image_url, redirect_url, display_order, is_active, created_at`;
  await logAdminAction(admin.id, "Banner Created", "Banner", row.id, { title: b.title });
  return json(row, { status: 201 });
});
