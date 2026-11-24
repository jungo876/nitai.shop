-- =============================================================================
-- 20261125000002_integrity_and_features.sql
--
-- 1. Normalises legacy data (old status names, orphaned/duplicate cart rows).
-- 2. Adds the constraints the application relies on (valid statuses, foreign
--    keys with the right ON DELETE behaviour, non-negative money, uniqueness).
-- 3. Adds new tables: sessions, otp_challenges, store_settings.
-- 4. Adds order fields: order number, payment verification, address/customer
--    snapshots, timestamps, admin "seen" marker.
-- 5. Adds indexes for every query path the API uses.
--
-- Safe to re-run; never deletes products, brands, users or orders.
-- =============================================================================

-- Helper: (re)create a foreign key on a single column with the given ON DELETE
-- action, dropping whatever FK currently exists on that column. Temporary;
-- dropped at the end of this migration.
create or replace function pg_temp.replace_fk(
  tbl regclass, col text, ref regclass, refcol text, on_delete text, fk_name text
) returns void language plpgsql as $$
declare
  c record;
  colnum smallint;
begin
  select attnum into colnum from pg_attribute where attrelid = tbl and attname = col and not attisdropped;
  for c in
    select conname from pg_constraint
    where conrelid = tbl and contype = 'f' and conkey = array[colnum]
  loop
    execute format('alter table %s drop constraint %I', tbl, c.conname);
  end loop;
  execute format('alter table %s add constraint %I foreign key (%I) references %s(%I) on delete %s',
                 tbl, fk_name, col, ref, refcol, on_delete);
end $$;

-- =============================================================================
-- 1. Data normalisation
-- =============================================================================

update public.users set is_admin = false where is_admin is null;
update public.users set is_profile_complete = false where is_profile_complete is null;
update public.users set phone_number = btrim(phone_number) where phone_number <> btrim(phone_number);

update public.products set status = 'active' where status is null;
update public.products set status = 'hidden'
  where status not in ('active', 'out_of_stock', 'coming_soon', 'hidden');
update public.products set is_top_selling = false where is_top_selling is null;
update public.products set description = '' where description is null;
update public.products set image_url = '' where image_url is null;

-- Payment / order status vocabulary (see src/lib/order-status.ts).
update public.orders set payment_status = 'paid'         where payment_status = 'fully_paid';
update public.orders set payment_status = 'advance_paid' where payment_status = 'partially_paid';
update public.orders set payment_status = 'failed'       where payment_status = 'cancelled';
update public.orders set payment_status = 'pending'
  where payment_status not in ('pending', 'advance_paid', 'paid', 'failed', 'refunded');
update public.orders set order_status = 'placed' where order_status = 'pending';
update public.orders set order_status = 'placed'
  where order_status not in ('pending_payment', 'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
update public.orders set payment_method = 'prepaid' where payment_method is null or payment_method = 'razorpay';
update public.orders set payment_method = 'prepaid' where payment_method not in ('prepaid', 'cod');
update public.orders set remaining_payment_method = null
  where remaining_payment_method is not null
    and remaining_payment_method not in ('cash_on_delivery', 'upi', 'bank_transfer', 'cash');

-- Cart rows that cannot be priced any more (deleted product/variant/tier) or
-- that belong to nobody are removed; duplicates are merged.
delete from public.cart_items where user_id is null;
delete from public.cart_items c
  where not exists (select 1 from public.products p where p.id = c.product_id)
     or not exists (select 1 from public.product_variants v where v.id = c.variant_id and v.product_id = c.product_id)
     or (c.bulk_price_id is not null and not exists (
           select 1 from public.bulk_prices b where b.id = c.bulk_price_id and b.variant_id = c.variant_id));
with ranked as (
  select id,
         sum(quantity) over w as total_qty,
         row_number() over (w order by created_at, id) as rn
  from public.cart_items
  window w as (partition by user_id, product_id, variant_id, bulk_price_id)
)
update public.cart_items c set quantity = r.total_qty
  from ranked r where c.id = r.id and r.rn = 1 and c.quantity <> r.total_qty;
delete from public.cart_items c using (
  select id, row_number() over (partition by user_id, product_id, variant_id, bulk_price_id order by created_at, id) as rn
  from public.cart_items
) d where c.id = d.id and d.rn > 1;
update public.cart_items set quantity = 1 where quantity is null or quantity < 1;
update public.cart_items set box_count = 1 where box_count is null or box_count < 1;

delete from public.wishlist_items where user_id is null or product_id is null;
delete from public.wishlist_items w using (
  select id, row_number() over (partition by user_id, product_id order by created_at, id) as rn
  from public.wishlist_items
) d where w.id = d.id and d.rn > 1;

-- One business profile / address per user. The old code "upserted" without a
-- unique key, which created duplicates; keep the most recent one.
delete from public.business_profiles b using (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as rn
  from public.business_profiles where user_id is not null
) d where b.id = d.id and d.rn > 1;
delete from public.addresses a using (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as rn
  from public.addresses where user_id is not null
) d where a.id = d.id and d.rn > 1;

-- Pricing rows whose parent is gone are unusable.
delete from public.bulk_prices b
  where b.variant_id is null or not exists (select 1 from public.product_variants v where v.id = b.variant_id);
delete from public.bulk_prices b using (
  select id, row_number() over (partition by variant_id, box_count order by created_at, id) as rn
  from public.bulk_prices
) d where b.id = d.id and d.rn > 1;

-- =============================================================================
-- 2. Columns
-- =============================================================================

alter table public.users add column if not exists updated_at timestamptz not null default now();
alter table public.users add column if not exists last_login_at timestamptz;
alter table public.products add column if not exists updated_at timestamptz not null default now();
alter table public.companies add column if not exists updated_at timestamptz not null default now();
alter table public.homepage_banners add column if not exists updated_at timestamptz not null default now();
alter table public.business_profiles add column if not exists updated_at timestamptz not null default now();
alter table public.addresses add column if not exists updated_at timestamptz not null default now();

alter table public.orders add column if not exists order_number bigint generated by default as identity;
alter table public.orders add column if not exists razorpay_signature text;
alter table public.orders add column if not exists shipping_address jsonb;
alter table public.orders add column if not exists customer_snapshot jsonb;
alter table public.orders add column if not exists payment_expires_at timestamptz;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists cancelled_at timestamptz;
alter table public.orders add column if not exists cancel_reason text;
alter table public.orders add column if not exists admin_seen_at timestamptz;
alter table public.orders add column if not exists admin_notes text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();

-- Existing orders are not "new" for the admin badge.
update public.orders set admin_seen_at = coalesce(admin_seen_at, now());
-- Paid timestamp for already-paid legacy orders.
update public.orders set paid_at = created_at where paid_at is null and payment_status in ('paid', 'advance_paid');
-- Best-effort snapshot of customer/address for legacy orders (new orders store it at checkout).
update public.orders o set customer_snapshot = jsonb_build_object(
    'name', u.name, 'phone_number', u.phone_number, 'whatsapp_number', u.whatsapp_number,
    'shop_name', bp.shop_name, 'gst_number', bp.gst_number, 'pan_number', bp.pan_number,
    'business_type', bp.business_type)
  from public.users u
  left join public.business_profiles bp on bp.user_id = u.id
  where o.user_id = u.id and o.customer_snapshot is null;
update public.orders o set shipping_address = jsonb_build_object(
    'address_line', a.address_line, 'landmark', a.landmark, 'city', a.city,
    'state', a.state, 'pincode', a.pincode, 'phone_number', a.phone_number)
  from public.addresses a
  where o.user_id = a.user_id and o.shipping_address is null;

-- =============================================================================
-- 3. Constraints and foreign keys
-- =============================================================================

-- users
alter table public.users alter column phone_number set not null;
alter table public.users alter column is_admin set not null;
alter table public.users alter column is_admin set default false;
alter table public.users alter column is_profile_complete set not null;
alter table public.users alter column is_profile_complete set default false;
create unique index if not exists users_phone_number_key on public.users (phone_number);

-- business_profiles / addresses: one row per user
select pg_temp.replace_fk('public.business_profiles', 'user_id', 'public.users', 'id', 'cascade', 'business_profiles_user_id_fkey');
create unique index if not exists business_profiles_user_id_key on public.business_profiles (user_id);
select pg_temp.replace_fk('public.addresses', 'user_id', 'public.users', 'id', 'cascade', 'addresses_user_id_fkey');
create unique index if not exists addresses_user_id_key on public.addresses (user_id);

-- products
alter table public.products alter column status set not null;
alter table public.products alter column status set default 'active';
alter table public.products alter column is_top_selling set not null;
alter table public.products alter column is_top_selling set default false;
alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check
  check (status in ('active', 'out_of_stock', 'coming_soon', 'hidden'));
select pg_temp.replace_fk('public.products', 'company_id', 'public.companies', 'id', 'set null', 'products_company_id_fkey');

-- product_variants
select pg_temp.replace_fk('public.product_variants', 'product_id', 'public.products', 'id', 'cascade', 'product_variants_product_id_fkey');
alter table public.product_variants drop constraint if exists product_variants_price_check;
alter table public.product_variants add constraint product_variants_price_check
  check (unit_price >= 0 and units_per_box >= 1);

-- bulk_prices
alter table public.bulk_prices alter column variant_id set not null;
alter table public.bulk_prices alter column box_count set not null;
alter table public.bulk_prices alter column price_per_unit set not null;
select pg_temp.replace_fk('public.bulk_prices', 'variant_id', 'public.product_variants', 'id', 'cascade', 'bulk_prices_variant_id_fkey');
alter table public.bulk_prices drop constraint if exists bulk_prices_values_check;
alter table public.bulk_prices add constraint bulk_prices_values_check
  check (box_count >= 1 and price_per_unit > 0);
create unique index if not exists bulk_prices_variant_box_key on public.bulk_prices (variant_id, box_count);

-- cart_items: rows disappear automatically when what they point to is deleted,
-- so a cart can never contain an item that would be priced at zero.
alter table public.cart_items alter column user_id set not null;
select pg_temp.replace_fk('public.cart_items', 'user_id', 'public.users', 'id', 'cascade', 'cart_items_user_id_fkey');
select pg_temp.replace_fk('public.cart_items', 'product_id', 'public.products', 'id', 'cascade', 'cart_items_product_id_fkey');
select pg_temp.replace_fk('public.cart_items', 'variant_id', 'public.product_variants', 'id', 'cascade', 'cart_items_variant_id_fkey');
select pg_temp.replace_fk('public.cart_items', 'bulk_price_id', 'public.bulk_prices', 'id', 'cascade', 'cart_items_bulk_price_id_fkey');
alter table public.cart_items drop constraint if exists cart_items_quantity_check;
alter table public.cart_items add constraint cart_items_quantity_check check (quantity between 1 and 1000 and box_count between 1 and 10000);
do $$
declare c record;
begin
  -- Replace the old unique constraint (which treated NULL tiers as distinct).
  for c in select conname from pg_constraint where conrelid = 'public.cart_items'::regclass and contype = 'u' loop
    execute format('alter table public.cart_items drop constraint %I', c.conname);
  end loop;
end $$;
create unique index if not exists cart_items_line_key
  on public.cart_items (user_id, product_id, variant_id, bulk_price_id) nulls not distinct;

-- wishlist_items
alter table public.wishlist_items alter column user_id set not null;
alter table public.wishlist_items alter column product_id set not null;
select pg_temp.replace_fk('public.wishlist_items', 'user_id', 'public.users', 'id', 'cascade', 'wishlist_items_user_id_fkey');
select pg_temp.replace_fk('public.wishlist_items', 'product_id', 'public.products', 'id', 'cascade', 'wishlist_items_product_id_fkey');
-- (uniqueness of (user_id, product_id) already exists as wishlist_items_user_id_product_id_key)

-- orders
select pg_temp.replace_fk('public.orders', 'user_id', 'public.users', 'id', 'set null', 'orders_user_id_fkey');
alter table public.orders alter column payment_method set not null;
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status in ('pending', 'advance_paid', 'paid', 'failed', 'refunded'));
alter table public.orders drop constraint if exists orders_order_status_check;
alter table public.orders add constraint orders_order_status_check
  check (order_status in ('pending_payment', 'placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('prepaid', 'cod'));
alter table public.orders drop constraint if exists orders_remaining_payment_method_check;
alter table public.orders add constraint orders_remaining_payment_method_check
  check (remaining_payment_method is null or remaining_payment_method in ('cash_on_delivery', 'upi', 'bank_transfer', 'cash'));
alter table public.orders drop constraint if exists orders_amounts_check;
alter table public.orders add constraint orders_amounts_check
  check (total_amount >= 0 and advance_amount >= 0 and remaining_amount >= 0
         and advance_amount + remaining_amount = total_amount);
create unique index if not exists orders_order_number_key on public.orders (order_number);
create unique index if not exists orders_razorpay_order_id_key on public.orders (razorpay_order_id) where razorpay_order_id is not null;
create unique index if not exists orders_razorpay_payment_id_key on public.orders (razorpay_payment_id) where razorpay_payment_id is not null;

-- order_items
alter table public.order_items alter column order_id set not null;
select pg_temp.replace_fk('public.order_items', 'order_id', 'public.orders', 'id', 'cascade', 'order_items_order_id_fkey');
alter table public.order_items drop constraint if exists order_items_values_check;
alter table public.order_items add constraint order_items_values_check
  check (box_count >= 1 and units_per_box >= 1 and total_units >= 0 and price_per_unit >= 0 and total_price >= 0);

-- admin_activity_logs: keep the audit trail even if an admin account is deleted
select pg_temp.replace_fk('public.admin_activity_logs', 'admin_user_id', 'public.users', 'id', 'set null', 'admin_activity_logs_admin_user_id_fkey');

-- =============================================================================
-- 4. New tables
-- =============================================================================

-- Login sessions. Only a SHA-256 hash of the cookie token is stored.
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now(),
  user_agent   text,
  ip           text
);
create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- One-time login codes. Codes are stored as HMACs, never in plain text.
create table if not exists public.otp_challenges (
  id           uuid primary key default gen_random_uuid(),
  phone_number text not null,
  code_hash    text,
  provider     text not null,
  provider_ref text,
  attempts     integer not null default 0,
  max_attempts integer not null default 5,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now(),
  ip           text
);
create index if not exists otp_challenges_phone_created_idx on public.otp_challenges (phone_number, created_at desc);
create index if not exists otp_challenges_ip_created_idx on public.otp_challenges (ip, created_at desc);

-- Store-wide settings (exactly one row, id = 1).
create table if not exists public.store_settings (
  id                  smallint primary key default 1 check (id = 1),
  store_name          text not null default 'NCK Agro',
  support_phone       text,
  whatsapp_number     text,
  support_email       text,
  business_address    text,
  store_status        text not null default 'open' check (store_status in ('open', 'closed')),
  closed_message      text,
  cod_enabled         boolean not null default true,
  cod_advance_percent smallint not null default 10 check (cod_advance_percent between 1 and 100),
  min_order_amount    numeric(12,2) not null default 0 check (min_order_amount >= 0),
  updated_at          timestamptz not null default now(),
  updated_by          uuid references public.users(id) on delete set null
);
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- =============================================================================
-- 5. Indexes for API query paths
-- =============================================================================
create index if not exists products_status_created_idx on public.products (status, created_at desc);
create index if not exists products_company_id_idx on public.products (company_id);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_home_category_idx on public.products (home_category);
create index if not exists products_top_selling_idx on public.products (created_at desc) where is_top_selling;
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);
create index if not exists bulk_prices_variant_id_idx on public.bulk_prices (variant_id);
create index if not exists cart_items_user_id_idx on public.cart_items (user_id);
create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);
create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_unseen_idx on public.orders (created_at desc) where admin_seen_at is null;
create index if not exists orders_pending_payment_idx on public.orders (payment_expires_at) where order_status = 'pending_payment';
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists admin_activity_logs_created_idx on public.admin_activity_logs (created_at desc);
create index if not exists homepage_banners_order_idx on public.homepage_banners (display_order);

-- =============================================================================
-- 6. updated_at maintenance
-- =============================================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['users', 'products', 'companies', 'homepage_banners',
                           'business_profiles', 'addresses', 'orders', 'store_settings']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

drop function pg_temp.replace_fk(regclass, text, regclass, text, text, text);
