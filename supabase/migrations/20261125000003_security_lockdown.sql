-- =============================================================================
-- 20261125000003_security_lockdown.sql
--
-- The application now reads and writes the database only from the server
-- (direct Postgres connection as the table owner, which bypasses RLS).
-- Supabase's public REST API therefore gets:
--   * NO access to customer data, carts, orders, sessions, OTPs, settings, logs
--   * READ-ONLY access to the public catalogue (visible products, their
--     variants and bulk prices, brands, active banners) — the same data the
--     website shows to everyone.
-- Storage: product images stay publicly readable; uploads/changes are only
-- possible with the server's secret key.
-- =============================================================================

-- 1. Row level security on every table in public, and remove every old policy
--    (the old "allow all to anon" policies made the database world-writable).
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 2. Privileges for Supabase's API roles (only where those roles exist).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables    in schema public from anon, authenticated;
    revoke all on all sequences in schema public from anon, authenticated;
    revoke all on all functions in schema public from anon, authenticated;
    -- Tables created later must not become visible automatically.
    alter default privileges in schema public revoke all on tables    from anon, authenticated;
    alter default privileges in schema public revoke all on sequences from anon, authenticated;
    alter default privileges in schema public revoke all on functions from anon, authenticated;

    grant usage on schema public to anon, authenticated;
    grant select on public.products, public.product_variants, public.bulk_prices,
                    public.companies, public.homepage_banners
      to anon, authenticated;
  end if;
end $$;

-- 3. Read-only catalogue policies (hidden products and inactive banners excluded).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    create policy catalogue_read_products on public.products
      for select to anon, authenticated
      using (status <> 'hidden');

    create policy catalogue_read_variants on public.product_variants
      for select to anon, authenticated
      using (exists (select 1 from public.products p
                     where p.id = product_variants.product_id and p.status <> 'hidden'));

    create policy catalogue_read_bulk_prices on public.bulk_prices
      for select to anon, authenticated
      using (exists (select 1 from public.product_variants v
                     join public.products p on p.id = v.product_id
                     where v.id = bulk_prices.variant_id and p.status <> 'hidden'));

    create policy catalogue_read_companies on public.companies
      for select to anon, authenticated
      using (true);

    create policy catalogue_read_banners on public.homepage_banners
      for select to anon, authenticated
      using (is_active);
  end if;
end $$;

-- 4. Storage: remove every policy that lets the public API (anon /
--    authenticated) write to storage. The app only uses the public
--    `product-images` bucket; reads of a *public* bucket need no policy, and
--    the server uploads with the secret key, which bypasses these policies.
do $$
declare r record;
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    for r in
      select policyname from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
        and (roles && array['anon', 'authenticated', 'public']::name[])
    loop
      execute format('drop policy if exists %I on storage.objects', r.policyname);
    end loop;
  end if;
end $$;
