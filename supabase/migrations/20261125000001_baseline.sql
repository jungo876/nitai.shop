-- =============================================================================
-- 20261125000001_baseline.sql
--
-- The schema the application used as of November 2026, reconstructed from the
-- code (the old ad-hoc scripts in supabase/legacy/ never fully described it).
--
-- Idempotent: on the existing Supabase database every statement is a no-op or
-- only adds what is missing; on a fresh database it creates everything.
-- Later migrations tighten constraints and add new features.
-- =============================================================================

-- ---------- users ------------------------------------------------------------
create table if not exists public.users (
  id                  uuid primary key default gen_random_uuid(),
  phone_number        text not null,
  whatsapp_number     text,
  name                text,
  email               text,
  avatar_url          text,
  is_profile_complete boolean not null default false,
  is_admin            boolean not null default false,
  created_at          timestamptz not null default now()
);
alter table public.users add column if not exists whatsapp_number text;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists is_profile_complete boolean default false;
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists created_at timestamptz default now();

-- ---------- business_profiles (one per user) ----------------------------------
create table if not exists public.business_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.users(id) on delete cascade,
  shop_name       text,
  gst_number      text,
  pan_number      text,
  is_gst_verified boolean not null default false,
  is_pan_verified boolean not null default false,
  business_type   text,
  license_number  text,
  created_at      timestamptz not null default now()
);
alter table public.business_profiles add column if not exists shop_name text;
alter table public.business_profiles add column if not exists gst_number text;
alter table public.business_profiles add column if not exists pan_number text;
alter table public.business_profiles add column if not exists is_gst_verified boolean default false;
alter table public.business_profiles add column if not exists is_pan_verified boolean default false;
alter table public.business_profiles add column if not exists business_type text;
alter table public.business_profiles add column if not exists license_number text;
alter table public.business_profiles add column if not exists created_at timestamptz default now();

-- ---------- addresses (one per user, used for shipping) -----------------------
create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references public.users(id) on delete cascade,
  address_line text,
  landmark     text,
  city         text,
  state        text,
  pincode      text,
  phone_number text,
  is_default   boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.addresses add column if not exists address_line text;
alter table public.addresses add column if not exists landmark text;
alter table public.addresses add column if not exists city text;
alter table public.addresses add column if not exists state text;
alter table public.addresses add column if not exists pincode text;
alter table public.addresses add column if not exists phone_number text;
alter table public.addresses add column if not exists is_default boolean default true;
alter table public.addresses add column if not exists created_at timestamptz default now();

-- ---------- companies (brands) -------------------------------------------------
create table if not exists public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  logo_url   text not null default '',
  created_at timestamptz not null default now()
);
alter table public.companies add column if not exists logo_url text default '';
alter table public.companies add column if not exists created_at timestamptz default now();

-- ---------- products ------------------------------------------------------------
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text not null,
  home_category  text,
  description    text not null default '',
  image_url      text not null default '',
  company_id     uuid references public.companies(id) on delete set null,
  is_top_selling boolean not null default false,
  status         text not null default 'active',
  created_at     timestamptz not null default now()
);
alter table public.products add column if not exists home_category text;
alter table public.products add column if not exists description text default '';
alter table public.products add column if not exists image_url text default '';
alter table public.products add column if not exists company_id uuid;
alter table public.products add column if not exists is_top_selling boolean default false;
alter table public.products add column if not exists status text default 'active';
alter table public.products add column if not exists created_at timestamptz default now();

-- ---------- product_variants (pack sizes) ---------------------------------------
create table if not exists public.product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  label         text not null,
  unit_price    numeric(12,2) not null default 0,
  units_per_box integer not null default 1,
  created_at    timestamptz not null default now()
);
alter table public.product_variants add column if not exists unit_price numeric default 0;
alter table public.product_variants add column if not exists units_per_box integer default 1;
alter table public.product_variants add column if not exists created_at timestamptz default now();

-- ---------- bulk_prices (per-variant box-quantity tiers) ------------------------
create table if not exists public.bulk_prices (
  id             uuid primary key default gen_random_uuid(),
  variant_id     uuid not null references public.product_variants(id) on delete cascade,
  box_count      integer not null,
  price_per_unit numeric(12,2) not null,
  tag            text,
  created_at     timestamptz not null default now()
);
alter table public.bulk_prices add column if not exists variant_id uuid;
alter table public.bulk_prices add column if not exists box_count integer;
alter table public.bulk_prices add column if not exists price_per_unit numeric;
alter table public.bulk_prices add column if not exists tag text;
alter table public.bulk_prices add column if not exists created_at timestamptz default now();

-- ---------- cart_items ----------------------------------------------------------
create table if not exists public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id) on delete cascade,
  product_id    uuid not null,
  variant_id    uuid not null,
  bulk_price_id uuid,
  box_count     integer not null default 1,
  quantity      integer not null default 1,
  created_at    timestamptz not null default now()
);

-- ---------- wishlist_items ------------------------------------------------------
create table if not exists public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------- orders --------------------------------------------------------------
create table if not exists public.orders (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references public.users(id) on delete set null,
  total_amount             numeric(12,2) not null,
  advance_amount           numeric(12,2) not null,
  remaining_amount         numeric(12,2) not null,
  payment_status           text not null default 'pending',
  order_status             text not null default 'placed',
  payment_method           text,
  remaining_payment_method text default 'cash_on_delivery',
  razorpay_order_id        text,
  razorpay_payment_id      text,
  created_at               timestamptz not null default now()
);
alter table public.orders add column if not exists remaining_payment_method text default 'cash_on_delivery';

-- ---------- order_items (snapshot of what was bought) ---------------------------
create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references public.orders(id) on delete cascade,
  product_id     uuid,
  variant_id     uuid,
  bulk_price_id  uuid,
  product_name   text not null,
  variant_label  text not null,
  box_count      integer not null,
  units_per_box  integer not null,
  price_per_unit numeric(12,2) not null,
  total_units    integer not null,
  total_price    numeric(12,2) not null,
  created_at     timestamptz not null default now()
);

-- ---------- homepage_banners ----------------------------------------------------
create table if not exists public.homepage_banners (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  image_url     text not null,
  redirect_url  text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------- admin_activity_logs -------------------------------------------------
create table if not exists public.admin_activity_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.users(id) on delete set null,
  action        text not null,
  entity_type   text not null,
  entity_id     text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
