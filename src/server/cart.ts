import "server-only";
import { db, type Queryable } from "./db";
import { badRequest, conflict, notFound } from "./http";
import { toPaise, fromPaise } from "@/lib/money";

/**
 * Cart with server-side pricing. The client only says WHAT it wants
 * (variant + optional bulk tier + boxes); the price always comes from the
 * database and is re-checked at checkout.
 *
 * Line maths: total_units = box_count × units_per_box × quantity
 *             price/unit  = tier.price_per_unit if a tier is chosen, else variant.unit_price
 *             (computed in integer paise)
 */

export const MAX_LINE_QUANTITY = 1000;

export interface CartLine {
  id: string;
  product_id: string;
  variant_id: string;
  bulk_price_id: string | null;
  box_count: number;
  quantity: number;
  created_at: string;
  product_name: string;
  product_image: string;
  product_status: string;
  variant_label: string;
  units_per_box: number;
  price_per_unit: number;
  total_units: number;
  total_price: number;
  unit_price_paise: number;
  total_paise: number;
  available: boolean;
  unavailable_reason: string | null;
}

const STATUS_REASON: Record<string, string> = {
  out_of_stock: "Out of stock",
  coming_soon: "Not available yet",
  hidden: "No longer available",
};

export async function getCartLines(userId: string, sql: Queryable = db()): Promise<CartLine[]> {
  const rows = await sql`
    select ci.id, ci.product_id, ci.variant_id, ci.bulk_price_id, ci.box_count, ci.quantity, ci.created_at,
           p.name as product_name, p.image_url as product_image, p.status as product_status,
           v.label as variant_label, v.units_per_box, v.unit_price,
           b.price_per_unit as tier_price, b.box_count as tier_box_count
    from cart_items ci
    join products p on p.id = ci.product_id
    join product_variants v on v.id = ci.variant_id and v.product_id = ci.product_id
    left join bulk_prices b on b.id = ci.bulk_price_id and b.variant_id = ci.variant_id
    where ci.user_id = ${userId}
    order by ci.created_at desc, ci.id`;

  return rows.map((r) => {
    const price = r.bulk_price_id ? Number(r.tier_price) : Number(r.unit_price);
    const unitPaise = toPaise(price || 0);
    const totalUnits = Number(r.box_count) * Number(r.units_per_box) * Number(r.quantity);
    const totalPaise = unitPaise * totalUnits;
    let reason: string | null = STATUS_REASON[r.product_status as string] ?? null;
    if (!reason && r.bulk_price_id && r.tier_box_count !== r.box_count) reason = "Bulk offer changed — please re-add";
    if (!reason && unitPaise <= 0) reason = "Price not available";
    return {
      id: r.id,
      product_id: r.product_id,
      variant_id: r.variant_id,
      bulk_price_id: r.bulk_price_id,
      box_count: Number(r.box_count),
      quantity: Number(r.quantity),
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      product_name: r.product_name,
      product_image: r.product_image ?? "",
      product_status: r.product_status,
      variant_label: r.variant_label,
      units_per_box: Number(r.units_per_box),
      price_per_unit: fromPaise(unitPaise),
      total_units: totalUnits,
      total_price: fromPaise(totalPaise),
      unit_price_paise: unitPaise,
      total_paise: totalPaise,
      available: reason === null,
      unavailable_reason: reason,
    };
  });
}

export function summarise(lines: CartLine[]) {
  const available = lines.filter((l) => l.available);
  const subtotalPaise = available.reduce((s, l) => s + l.total_paise, 0);
  return {
    items: lines,
    count: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal: fromPaise(subtotalPaise),
    subtotal_paise: subtotalPaise,
    has_unavailable: lines.some((l) => !l.available),
  };
}

export async function addToCart(
  userId: string,
  input: { product_id: string; variant_id: string; bulk_price_id: string | null; box_count: number; quantity: number }
) {
  const sql = db();
  const [opt] = await sql`
    select p.status, v.unit_price, b.id as tier_id, b.box_count as tier_box_count
    from products p
    join product_variants v on v.product_id = p.id and v.id = ${input.variant_id}
    left join bulk_prices b on b.id = ${input.bulk_price_id} and b.variant_id = v.id
    where p.id = ${input.product_id}`;
  if (!opt) throw notFound("This product option is no longer available.");
  if (opt.status !== "active") throw conflict(`This product is ${STATUS_REASON[opt.status]?.toLowerCase() ?? "unavailable"}.`, "unavailable");
  if (input.bulk_price_id) {
    if (!opt.tier_id) throw badRequest("This bulk offer is not available for the selected pack size.");
    if (opt.tier_box_count !== input.box_count) throw badRequest("Box quantity does not match the selected bulk offer.");
  } else if (!(Number(opt.unit_price) > 0)) {
    throw conflict("This pack size has no price yet. Please contact us to order.", "no_price");
  }

  await sql`
    insert into cart_items (user_id, product_id, variant_id, bulk_price_id, box_count, quantity)
    values (${userId}, ${input.product_id}, ${input.variant_id}, ${input.bulk_price_id}, ${input.box_count}, ${input.quantity})
    on conflict (user_id, product_id, variant_id, bulk_price_id)
    do update set quantity = least(cart_items.quantity + excluded.quantity, ${MAX_LINE_QUANTITY}),
                  box_count = excluded.box_count`;
}

export async function setQuantity(userId: string, itemId: string, quantity: number) {
  const r = await db()`update cart_items set quantity = ${quantity} where id = ${itemId} and user_id = ${userId}`;
  if (r.count === 0) throw notFound("Cart item not found.");
}

export async function removeFromCart(userId: string, itemId: string) {
  const r = await db()`delete from cart_items where id = ${itemId} and user_id = ${userId}`;
  if (r.count === 0) throw notFound("Cart item not found.");
}
