-- =========================================================================
-- 0006_haccp_core.sql
-- Doel:
--   Kern-tabellen voor de HACCP modules (Koeling + Kerntemperatuur):
--     * haccp_equipments  – apparaten per restaurant (gedeeld door eigenaar
--       en medewerkers)
--     * haccp_records     – uniforme historie van temperatuur-registraties
--
--   Alle rijen zijn gekoppeld aan restaurant_id zodat eigenaar én staff van
--   hetzelfde restaurant dezelfde apparaten en historie zien.
--
--   RLS gebruikt de bestaande SECURITY DEFINER helper
--     public.is_member_of_restaurant(uuid)
--   uit 0005 om recursie tussen profiles/restaurants te vermijden.
-- =========================================================================

-- -----------------------------
-- haccp_equipments
-- -----------------------------
create table if not exists public.haccp_equipments (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  type            text not null check (type in ('koeling', 'kerntemperatuur')),
  last_temp       numeric(5,2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists haccp_equipments_restaurant_type_idx
  on public.haccp_equipments (restaurant_id, type);

-- updated_at trigger
create or replace function public.haccp_equipments_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists haccp_equipments_set_updated_at on public.haccp_equipments;
create trigger haccp_equipments_set_updated_at
  before update on public.haccp_equipments
  for each row execute function public.haccp_equipments_set_updated_at();

-- -----------------------------
-- haccp_records
-- -----------------------------
create table if not exists public.haccp_records (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  module_type     text not null check (module_type in ('koeling', 'kerntemperatuur')),
  equipment_id    uuid references public.haccp_equipments(id) on delete set null,
  temperature     numeric(5,2) not null,
  recorded_at     timestamptz not null default now(),
  image_urls      text[] not null default '{}'::text[],
  created_at      timestamptz not null default now()
);

create index if not exists haccp_records_restaurant_recorded_idx
  on public.haccp_records (restaurant_id, recorded_at desc);

create index if not exists haccp_records_equipment_recorded_idx
  on public.haccp_records (equipment_id, recorded_at desc);

-- =========================================================================
-- RLS – alleen leden van hetzelfde restaurant mogen lezen/schrijven.
-- =========================================================================
alter table public.haccp_equipments enable row level security;
alter table public.haccp_records    enable row level security;

-- ---- haccp_equipments ----
drop policy if exists "members_can_read_equipments"   on public.haccp_equipments;
drop policy if exists "members_can_insert_equipments" on public.haccp_equipments;
drop policy if exists "members_can_update_equipments" on public.haccp_equipments;
drop policy if exists "members_can_delete_equipments" on public.haccp_equipments;

create policy "members_can_read_equipments"
  on public.haccp_equipments
  for select
  using (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_insert_equipments"
  on public.haccp_equipments
  for insert
  with check (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_update_equipments"
  on public.haccp_equipments
  for update
  using (public.is_member_of_restaurant(restaurant_id))
  with check (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_delete_equipments"
  on public.haccp_equipments
  for delete
  using (public.is_member_of_restaurant(restaurant_id));

-- ---- haccp_records ----
drop policy if exists "members_can_read_records"   on public.haccp_records;
drop policy if exists "members_can_insert_records" on public.haccp_records;
drop policy if exists "members_can_update_records" on public.haccp_records;
drop policy if exists "members_can_delete_records" on public.haccp_records;

create policy "members_can_read_records"
  on public.haccp_records
  for select
  using (public.is_member_of_restaurant(restaurant_id));

-- Bij insert: lid van het restaurant én user_id moet auth.uid() zijn
-- (anders zou iemand een record op naam van een collega kunnen wegschrijven).
create policy "members_can_insert_records"
  on public.haccp_records
  for insert
  with check (
    public.is_member_of_restaurant(restaurant_id)
    and (user_id is null or user_id = auth.uid())
  );

-- Records zijn in principe append-only, maar we staan correctie toe door
-- de auteur of de eigenaar van het restaurant.
create policy "members_can_update_records"
  on public.haccp_records
  for update
  using (
    public.is_member_of_restaurant(restaurant_id)
    and (
      user_id = auth.uid()
      or public.is_owner_of_restaurant(restaurant_id)
    )
  )
  with check (
    public.is_member_of_restaurant(restaurant_id)
    and (
      user_id = auth.uid()
      or public.is_owner_of_restaurant(restaurant_id)
    )
  );

create policy "members_can_delete_records"
  on public.haccp_records
  for delete
  using (
    public.is_member_of_restaurant(restaurant_id)
    and (
      user_id = auth.uid()
      or public.is_owner_of_restaurant(restaurant_id)
    )
  );
