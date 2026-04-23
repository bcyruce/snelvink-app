-- =========================================================================
-- 0007_ontvangst.sql
-- Phase 2: Ontvangst module
--
--   * Nieuwe tabel haccp_products – lijst met producten per restaurant
--     (gedeeld door eigenaar en staff).
--   * Uitbreiding van haccp_records met de velden die ontvangst nodig
--     heeft (product_name / status / reason) en een versoepeling van
--     temperature (ontvangst heeft geen temperatuur).
--
--   RLS gebruikt de bestaande helper public.is_member_of_restaurant(uuid)
--   uit 0005.
-- =========================================================================

-- -----------------------------
-- haccp_products
-- -----------------------------
create table if not exists public.haccp_products (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists haccp_products_restaurant_idx
  on public.haccp_products (restaurant_id);

alter table public.haccp_products enable row level security;

drop policy if exists "members_can_read_products"   on public.haccp_products;
drop policy if exists "members_can_insert_products" on public.haccp_products;
drop policy if exists "members_can_update_products" on public.haccp_products;
drop policy if exists "members_can_delete_products" on public.haccp_products;

create policy "members_can_read_products"
  on public.haccp_products
  for select
  using (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_insert_products"
  on public.haccp_products
  for insert
  with check (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_update_products"
  on public.haccp_products
  for update
  using (public.is_member_of_restaurant(restaurant_id))
  with check (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_delete_products"
  on public.haccp_products
  for delete
  using (public.is_member_of_restaurant(restaurant_id));

-- -----------------------------
-- haccp_records: extra kolommen voor ontvangst
-- -----------------------------
alter table public.haccp_records add column if not exists product_name text;
alter table public.haccp_records add column if not exists status       text;
alter table public.haccp_records add column if not exists reason       text;

-- Ontvangst heeft geen temperatuur → kolom mag nu null zijn.
alter table public.haccp_records alter column temperature drop not null;

-- module_type check uitbreiden met 'ontvangst'.
alter table public.haccp_records
  drop constraint if exists haccp_records_module_type_check;
alter table public.haccp_records
  add constraint haccp_records_module_type_check
  check (module_type in ('koeling', 'kerntemperatuur', 'ontvangst'));

-- Status-check (alleen als de waarde gezet is).
alter table public.haccp_records
  drop constraint if exists haccp_records_status_check;
alter table public.haccp_records
  add constraint haccp_records_status_check
  check (status is null or status in ('goedgekeurd', 'afgekeurd'));
