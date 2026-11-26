import { json, readJson, route } from "@/server/http";
import { enforceRateLimit } from "@/server/rate-limit";
import { getCurrentUser, requireUser } from "@/server/auth/session";
import { addToCart, getCartLines, removeFromCart, setQuantity, summarise } from "@/server/cart";
import { addToCartSchema, removeCartSchema, updateCartSchema } from "@/lib/validations/cart";

/** GET /api/cart -> { items, count, subtotal, has_unavailable } (empty when logged out). */
export const GET = route(async (req) => {
  const user = await getCurrentUser(req);
  if (!user) return json({ items: [], count: 0, subtotal: 0, subtotal_paise: 0, has_unavailable: false });
  return json(summarise(await getCartLines(user.id)));
});

/** POST /api/cart { product_id, variant_id, bulk_price_id?, box_count, quantity? } */
export const POST = route(async (req) => {
  const user = await requireUser(req);
  await enforceRateLimit("cart", user.id);
  const input = await readJson(req, addToCartSchema);
  await addToCart(user.id, input);
  return json(summarise(await getCartLines(user.id)), { status: 201 });
});

/** PATCH /api/cart { item_id, quantity } */
export const PATCH = route(async (req) => {
  const user = await requireUser(req);
  await enforceRateLimit("cart", user.id);
  const { item_id, quantity } = await readJson(req, updateCartSchema);
  await setQuantity(user.id, item_id, quantity);
  return json(summarise(await getCartLines(user.id)));
});

/** DELETE /api/cart { item_id } */
export const DELETE = route(async (req) => {
  const user = await requireUser(req);
  await enforceRateLimit("cart", user.id);
  const { item_id } = await readJson(req, removeCartSchema);
  await removeFromCart(user.id, item_id);
  return json(summarise(await getCartLines(user.id)));
});
