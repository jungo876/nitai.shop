import "server-only";
import { db } from "../db";

function likePattern(s: string) {
  return `%${s.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
}

export async function listCustomers(opts: { search?: string; limit?: number; offset?: number }) {
  const sql = db();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const s = opts.search?.trim();
  const where = s
    ? sql`where u.name ilike ${likePattern(s)} or u.phone_number like ${likePattern(s.replace(/\D/g, "") || s)}
             or b.shop_name ilike ${likePattern(s)} or b.gst_number ilike ${likePattern(s)} or a.city ilike ${likePattern(s)}`
    : sql``;
  const rows = await sql`
    select u.id, u.name, u.phone_number, u.whatsapp_number, u.is_admin, u.is_profile_complete, u.created_at, u.last_login_at,
           b.shop_name, b.gst_number, b.business_type, a.city, a.state,
           coalesce(o.orders, 0) as orders, coalesce(o.spent, 0) as total_spent, o.last_order_at
    from users u
    left join business_profiles b on b.user_id = u.id
    left join addresses a on a.user_id = u.id
    left join lateral (
      select count(*) as orders, sum(total_amount) as spent, max(created_at) as last_order_at
      from orders where user_id = u.id and payment_status in ('paid','advance_paid') and order_status <> 'cancelled'
    ) o on true
    ${where}
    order by u.created_at desc
    limit ${limit} offset ${offset}`;
  const [{ total }] = await sql`
    select count(*) as total from users u
    left join business_profiles b on b.user_id = u.id left join addresses a on a.user_id = u.id ${where}`;
  return { customers: rows, total: Number(total), limit, offset };
}

export async function getCustomer(id: string) {
  const sql = db();
  const [u] = await sql`
    select u.id, u.name, u.phone_number, u.whatsapp_number, u.email, u.is_admin, u.is_profile_complete, u.created_at, u.last_login_at,
           b.shop_name, b.gst_number, b.pan_number, b.business_type,
           a.address_line, a.landmark, a.city, a.state, a.pincode
    from users u
    left join business_profiles b on b.user_id = u.id
    left join addresses a on a.user_id = u.id
    where u.id = ${id}`;
  if (!u) return null;
  const orders = await sql`
    select id, order_number, total_amount, advance_amount, remaining_amount, payment_status, order_status, payment_method, created_at
    from orders where user_id = ${id} and order_status <> 'pending_payment'
    order by created_at desc limit 100`;
  return { customer: u, orders };
}
