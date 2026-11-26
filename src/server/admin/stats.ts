import "server-only";
import { db } from "../db";

/** Orders that count as real sales (paid or advance-paid, not cancelled). */
const SALE = `payment_status in ('paid','advance_paid') and order_status <> 'cancelled'`;

export async function dashboardStats() {
  const sql = db();
  const [k] = await sql`
    select
      coalesce(sum(total_amount) filter (where ${sql.unsafe(SALE)}), 0) as order_value,
      coalesce(sum(advance_amount) filter (where payment_status in ('paid','advance_paid')), 0) as collected_online,
      coalesce(sum(remaining_amount) filter (where payment_status = 'advance_paid' and order_status <> 'cancelled'), 0) as balance_due,
      count(*) filter (where ${sql.unsafe(SALE)}) as orders,
      count(*) filter (where ${sql.unsafe(SALE)} and created_at >= date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata') as orders_today,
      count(*) filter (where order_status in ('placed','confirmed','processing')) as open_orders,
      count(*) filter (where admin_seen_at is null and order_status <> 'pending_payment') as unseen_orders
    from orders`;
  const [p] = await sql`
    select count(*) as products,
           count(*) filter (where status = 'out_of_stock') as out_of_stock,
           count(*) filter (where status = 'hidden') as hidden,
           count(*) filter (where status = 'active' and not exists (select 1 from product_variants v where v.product_id = products.id)) as without_price
    from products`;
  const [c] = await sql`select count(*) as customers, count(*) filter (where created_at > now() - interval '30 days') as new_customers from users where not is_admin`;
  const recent = await sql`
    select id, order_number, total_amount, order_status, payment_status, payment_method, created_at, admin_seen_at,
           customer_snapshot->>'name' as customer_name, customer_snapshot->>'shop_name' as shop_name
    from orders where order_status <> 'pending_payment'
      and not (order_status = 'cancelled' and coalesce(cancel_reason,'') in ('superseded','payment_timeout','payment_init_failed'))
    order by created_at desc limit 8`;
  const attention = await sql`
    select id, name, status,
           case when status = 'out_of_stock' then 'Out of stock'
                when not exists (select 1 from product_variants v where v.product_id = p.id) then 'No pack size / price'
                when image_url = '' then 'No image' end as issue
    from products p
    where status = 'out_of_stock'
       or (status = 'active' and (image_url = '' or not exists (select 1 from product_variants v where v.product_id = p.id)))
    order by name limit 10`;
  return { kpis: { ...k, ...p, ...c }, recent_orders: recent, attention_products: attention };
}

export async function analytics(rangeDays: number | null) {
  const sql = db();
  const since = rangeDays ? sql`and o.created_at >= now() - make_interval(days => ${rangeDays})` : sql``;
  const daily = await sql`
    select to_char((o.created_at at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD') as date,
           sum(o.total_amount) as sales, count(*) as orders
    from orders o where ${sql.unsafe(SALE.replace(/payment_status|order_status/g, (m) => "o." + m))} ${since}
    group by 1 order by 1`;
  const byStatus = await sql`
    select o.order_status as name, count(*) as count from orders o
    where o.order_status <> 'pending_payment' ${since} group by 1 order by 2 desc`;
  const byMethod = await sql`
    select o.payment_method as name, count(*) as value from orders o
    where ${sql.unsafe(SALE.replace(/payment_status|order_status/g, (m) => "o." + m))} ${since} group by 1`;
  const topProducts = await sql`
    select oi.product_name as name, sum(oi.total_units) as units, sum(oi.total_price) as revenue
    from order_items oi join orders o on o.id = oi.order_id
    where ${sql.unsafe(SALE.replace(/payment_status|order_status/g, (m) => "o." + m))} ${since}
    group by 1 order by revenue desc limit 8`;
  const byCategory = await sql`
    select coalesce(p.category, 'Deleted products') as name, sum(oi.total_price) as revenue
    from order_items oi join orders o on o.id = oi.order_id left join products p on p.id = oi.product_id
    where ${sql.unsafe(SALE.replace(/payment_status|order_status/g, (m) => "o." + m))} ${since}
    group by 1 order by 2 desc`;
  return { daily, by_status: byStatus, by_method: byMethod, top_products: topProducts, by_category: byCategory };
}
