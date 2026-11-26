import { assertUuid, json, route } from "@/server/http";
import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";

/** DELETE /api/wishlist/:productId */
export const DELETE = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const productId = assertUuid((await params).id, "product id");
  await db()`delete from wishlist_items where user_id = ${user.id} and product_id = ${productId}`;
  return json({ success: true });
});
