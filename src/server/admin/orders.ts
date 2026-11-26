import "server-only";
import { db } from "../db";
import { badRequest, notFound } from "../http";
import type { z } from "zod";
import type { adminUpdateOrderSchema } from "@/lib/validations/order";
import { formatOrderNumber } from "@/lib/order-status";

export interface AdminOrderFilters {
  status?: string; // order_status or special filters
  payment?: string; // payment_status
  search?: string;
  unseenOnly?: boolean;
  includeAbandoned?: boolean;
  limit?: number;
  offset?: number;
}

const ORDER_COLUMNS = (alias = "o") => `
  ${alias}.id, ${alias}.order_number, ${alias}.user_id, ${alias}.total_amount, ${alias}.advance_amount, ${alias}.remaining_amount,
  ${alias}.payment_status, ${alias}.order_status, ${alias}.payment_method, ${alias}.remaining_payment_method,
  ${alias}.razorpay_order_id, ${alias}.razorpay_payment_id, ${alias}.customer_snapshot, ${alias}.shipping_address,
  ${alias}.created_at, ${alias}.paid_at, ${alias}.cancelled_at, ${alias}.cancel_reason, ${alias}.admin_seen_at,
  ${alias}.admin_notes, ${alias}.updated_at`;

function likePattern(s: string) {
  return `%${s.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
}

export async function listAdminOrders(f: AdminOrderFilters) {
  const sql = db();
  const limit = Math.min(Math.max(f.limit ?? 50, 1), 200);
  const offset = Math.max(f.offset ?? 0, 0);
  const search = f.search?.trim();
  const numberSearch = search?.replace(/^NCK-?/i, "").replace(/^0+/, "");

  const where = sql`
    where true
      ${f.includeAbandoned ? sql`` : sql`and o.order_status <> 'pending_payment' and not (o.order_status = 'cancelled' and coalesce(o.cancel_reason,'') in ('superseded','payment_timeout','payment_init_failed'))`}
      ${f.status ? sql`and o.order_status = ${f.status}` : sql``}
      ${f.payment ? sql`and o.payment_status = ${f.payment}` : sql``}
      ${f.unseenOnly ? sql`and o.admin_seen_at is null` : sql``}
      ${search
        ? sql`and (
            o.customer_snapshot->>'name' ilike ${likePattern(search)}
            or o.customer_snapshot->>'shop_name' ilike ${likePattern(search)}
            or o.customer_snapshot->>'phone_number' like ${likePattern(search.replace(/\D/g, "") || search)}
            or o.id::text ilike ${likePattern(search)}
            ${numberSearch && /^\d+$/.test(numberSearch) ? sql`or o.order_number = ${Number(numberSearch)}` : sql``}
          )`
        : sql``}`;

  const rows = await sql`
    select ${sql.unsafe(ORDER_COLUMNS())},
           coalesce((select jsonb_agg(jsonb_build_object(
               'id', oi.id, 'product_name', oi.product_name, 'variant_label', oi.variant_label, 'box_count', oi.box_count,
               'units_per_box', oi.units_per_box, 'price_per_unit', oi.price_per_unit, 'total_units', oi.total_units,
               'total_price', oi.total_price) order by oi.created_at, oi.id)
             from order_items oi where oi.order_id = o.id), '[]'::jsonb) as items
    from orders o
    ${where}
    order by o.created_at desc
    limit ${limit} offset ${offset}`;
  const [{ total }] = await sql`select count(*) as total from orders o ${where}`;
  return { orders: rows.map(decorate), total: Number(total), limit, offset };
}

function decorate(o: Record<string, unknown>) {
  const c = (o.customer_snapshot as Record<string, string | null> | null) ?? {};
  return {
    ...o,
    order_number_display: formatOrderNumber(o.order_number as number),
    customer_name: c.name ?? "—",
    customer_phone: c.phone_number ?? "",
    customer_whatsapp: c.whatsapp_number ?? "",
    shop_name: c.shop_name ?? "",
    gst_number: c.gst_number ?? "",
    pan_number: c.pan_number ?? "",
    address: o.shipping_address ?? null,
    is_new: o.admin_seen_at === null,
  };
}

export async function getAdminOrderCounts() {
  const [r] = await db()`
    select
      count(*) filter (where admin_seen_at is null and order_status <> 'pending_payment') as unseen,
      count(*) filter (where order_status in ('placed','confirmed','processing')) as open,
      count(*) filter (where payment_status = 'advance_paid' and order_status <> 'cancelled') as balance_due
    from orders`;
  return { unseen: Number(r.unseen), open: Number(r.open), balance_due: Number(r.balance_due) };
}

export async function updateAdminOrder(input: z.infer<typeof adminUpdateOrderSchema>) {
  const sql = db();
  const [current] = await sql`select id, order_status, payment_status, payment_method from orders where id = ${input.order_id}`;
  if (!current) throw notFound("Order not found.");
  if (current.order_status === "pending_payment") throw badRequest("This order has not been paid yet and cannot be changed.");
  if (input.payment_status === "advance_paid" && current.payment_method === "prepaid") {
    throw badRequest("A prepaid order cannot be marked as advance paid.");
  }

  const updates: Record<string, unknown> = {};
  if (input.order_status) updates.order_status = input.order_status;
  if (input.payment_status) updates.payment_status = input.payment_status;
  if (input.remaining_payment_method !== undefined) updates.remaining_payment_method = input.remaining_payment_method;
  if (input.admin_notes !== undefined) updates.admin_notes = input.admin_notes;

  const [row] = await sql`
    update orders set ${sql(updates)},
      cancelled_at = case when ${input.order_status ?? null}::text = 'cancelled' then coalesce(cancelled_at, now())
                          when ${input.order_status ?? null}::text is not null then null else cancelled_at end,
      cancel_reason = case when ${input.order_status ?? null}::text = 'cancelled' then coalesce(cancel_reason, 'admin')
                           when ${input.order_status ?? null}::text is not null then null else cancel_reason end,
      admin_seen_at = coalesce(admin_seen_at, now())
    where id = ${input.order_id}
    returning id, order_status, payment_status, remaining_payment_method, admin_notes`;
  return { before: current, after: row };
}

export async function markOrdersSeen(ids: string[] | "all") {
  const sql = db();
  if (ids === "all") return (await sql`update orders set admin_seen_at = now() where admin_seen_at is null`).count;
  return (await sql`update orders set admin_seen_at = now() where admin_seen_at is null and id = any(${ids}::uuid[])`).count;
}

/** Neutralises spreadsheet formula injection and escapes CSV. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function ordersCsv(): Promise<string> {
  const { orders } = await listAdminOrders({ limit: 200, offset: 0 });
  const all = [...orders];
  for (let offset = 200; all.length === offset; offset += 200) {
    const more = await listAdminOrders({ limit: 200, offset });
    all.push(...more.orders);
    if (!more.orders.length) break;
  }
  const header = ["Order", "Date", "Customer", "Shop", "Phone", "GST", "City", "Pincode", "Payment method", "Total", "Paid online", "Balance due", "Payment status", "Order status", "Razorpay payment"];
  const lines = [header.map(csvCell).join(",")];
  type CsvOrder = Record<string, unknown> & { address?: { city?: string; pincode?: string } | null; created_at: string | Date };
  for (const o of all as unknown as CsvOrder[]) {
    lines.push([
      o.order_number_display, new Date(o.created_at).toISOString().slice(0, 10), o.customer_name, o.shop_name,
      o.customer_phone, o.gst_number, o.address?.city ?? "", o.address?.pincode ?? "", o.payment_method,
      o.total_amount, o.advance_amount, o.remaining_amount, o.payment_status, o.order_status, o.razorpay_payment_id ?? "",
    ].map(csvCell).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel shows ₹/Bengali text correctly
}
