-- =========================================================================
-- 0008_schoonmaak.sql
-- Phase 3: Schoonmaak module
--
--   * haccp_locations        – locaties per restaurant (gedeeld)
--   * haccp_cleaning_tasks   – schoonmaaktaken per locatie
--   * haccp_records uitbreiden met location_name + completed_tasks
--
--   RLS gebruikt de bestaande helper public.is_member_of_restaurant(uuid).
-- =========================================================================

-- -----------------------------
-- haccp_locations
-- -----------------------------
create table if not exists public.haccp_locations (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists haccp_locations_restaurant_idx
  on public.haccp_locations (restaurant_id);

alter table public.haccp_locations enable row level security;

drop policy if exists "members_can_read_locations"   on public.haccp_locations;
drop policy if exists "members_can_insert_locations" on public.haccp_locations;
drop policy if exists "members_can_update_locations" on public.haccp_locations;
drop policy if exists "members_can_delete_locations" on public.haccp_locations;

create policy "members_can_read_locations"
  on public.haccp_locations
  for select
  using (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_insert_locations"
  on public.haccp_locations
  for insert
  with check (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_update_locations"
  on public.haccp_locations
  for update
  using (public.is_member_of_restaurant(restaurant_id))
  with check (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_delete_locations"
  on public.haccp_locations
  for delete
  using (public.is_member_of_restaurant(restaurant_id));

-- -----------------------------
-- haccp_cleaning_tasks
-- -----------------------------
create table if not exists public.haccp_cleaning_tasks (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  location_id     uuid not null references public.haccp_locations(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now()
);

create index if not exists haccp_cleaning_tasks_location_idx
  on public.haccp_cleaning_tasks (location_id);

create index if not exists haccp_cleaning_tasks_restaurant_idx
  on public.haccp_cleaning_tasks (restaurant_id);

alter table public.haccp_cleaning_tasks enable row level security;

drop policy if exists "members_can_read_cleaning_tasks"   on public.haccp_cleaning_tasks;
drop policy if exists "members_can_insert_cleaning_tasks" on public.haccp_cleaning_tasks;
drop policy if exists "members_can_update_cleaning_tasks" on public.haccp_cleaning_tasks;
drop policy if exists "members_can_delete_cleaning_tasks" on public.haccp_cleaning_tasks;

create policy "members_can_read_cleaning_tasks"
  on public.haccp_cleaning_tasks
  for select
  using (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_insert_cleaning_tasks"
  on public.haccp_cleaning_tasks
  for insert
  with check (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_update_cleaning_tasks"
  on public.haccp_cleaning_tasks
  for update
  using (public.is_member_of_restaurant(restaurant_id))
  with check (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_delete_cleaning_tasks"
  on public.haccp_cleaning_tasks
  for delete
  using (public.is_member_of_restaurant(restaurant_id));

-- -----------------------------
-- haccp_records uitbreiden voor schoonmaak
-- -----------------------------
alter table public.haccp_records add column if not exists location_name   text;
alter table public.haccp_records add column if not exists completed_tasks text[];

-- module_type check uitbreiden met 'schoonmaak'.
alter table public.haccp_records
  drop constraint if exists haccp_records_module_type_check;
alter table public.haccp_records
  add constraint haccp_records_module_type_check
  check (
    module_type in ('koeling', 'kerntemperatuur', 'ontvangst', 'schoonmaak')
  );
