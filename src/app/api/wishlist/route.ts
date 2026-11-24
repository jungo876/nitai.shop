import { json, notFound, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { getCurrentUser, requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { wishlistSchema } from "@/lib/validations/product";

/** GET /api/wishlist[?ids_only=true] */
export const GET = route(async (req) => {
  const user = await getCurrentUser(req);
  if (!user) return json({ items: [], product_ids: [] });
  const rows = await db()`
    select w.id as wishlist_id, w.created_at, p.id as product_id, p.name as product_name,
           p.image_url as product_image, p.category, p.status, cheapest.label as variant_label, cheapest.unit_price
    from wishlist_items w
    join products p on p.id = w.product_id
    left join lateral (
      select v.label, v.unit_price from product_variants v
      where v.product_id = p.id order by v.unit_price, v.created_at limit 1
    ) cheapest on true
    where w.user_id = ${user.id} and p.status <> 'hidden'
    order by w.created_at desc`;
  const product_ids = rows.map((r) => r.product_id as string);
  if (req.nextUrl.searchParams.get("ids_only") === "true") return json({ product_ids });
  return json({
    items: rows.map((r) => ({
      ...r,
      product_image: r.product_image ?? "",
      variant_label: r.variant_label ?? "",
      unit_price: Number(r.unit_price ?? 0),
    })),
    product_ids,
  });
});

/** POST /api/wishlist { product_id } */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  await enforceRateLimit("write", user.id);
  const { product_id } = await readJson(req, wishlistSchema);
  const sql = db();
  const [p] = await sql`select 1 from products where id = ${product_id} and status <> 'hidden'`;
  if (!p) throw notFound("Product not found.");
  await sql`
    insert into wishlist_items (user_id, product_id) values (${user.id}, ${product_id})
    on conflict (user_id, product_id) do nothing`;
  return json({ success: true }, { status: 201 });
});
