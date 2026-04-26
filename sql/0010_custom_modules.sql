-- =========================================================================
-- 0010_custom_modules.sql
-- Doel:
--   Dynamische aangepaste HACCP onderdelen + registraties.
--
--   * custom_modules      – configuratie per restaurant
--   * custom_module_logs  – uitgevoerde registraties met JSON log_data
--
--   RLS gebruikt public.is_member_of_restaurant(uuid), zodat eigenaar én
--   medewerkers van hetzelfde restaurant dezelfde onderdelen en historie zien.
-- =========================================================================

-- -----------------------------
-- custom_modules
-- -----------------------------
create table if not exists public.custom_modules (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  name            text not null,
  icon            text not null default 'thermometer',
  module_type     text not null default 'temperature',
  settings        jsonb not null default '[]'::jsonb,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.custom_modules add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
alter table public.custom_modules add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.custom_modules add column if not exists name text;
alter table public.custom_modules add column if not exists icon text not null default 'thermometer';
alter table public.custom_modules add column if not exists module_type text not null default 'temperature';
alter table public.custom_modules add column if not exists settings jsonb not null default '[]'::jsonb;
alter table public.custom_modules add column if not exists is_active boolean not null default true;
alter table public.custom_modules add column if not exists created_at timestamptz not null default now();
alter table public.custom_modules add column if not exists updated_at timestamptz not null default now();

create index if not exists custom_modules_restaurant_active_idx
  on public.custom_modules (restaurant_id, is_active, created_at desc);

create or replace function public.custom_modules_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists custom_modules_set_updated_at on public.custom_modules;
create trigger custom_modules_set_updated_at
  before update on public.custom_modules
  for each row execute function public.custom_modules_set_updated_at();

-- -----------------------------
-- custom_module_logs
-- -----------------------------
create table if not exists public.custom_module_logs (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  module_id         uuid references public.custom_modules(id) on delete set null,
  custom_module_id  uuid references public.custom_modules(id) on delete set null,
  log_data          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

alter table public.custom_module_logs add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade;
alter table public.custom_module_logs add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.custom_module_logs add column if not exists module_id uuid references public.custom_modules(id) on delete set null;
alter table public.custom_module_logs add column if not exists custom_module_id uuid references public.custom_modules(id) on delete set null;
alter table public.custom_module_logs add column if not exists log_data jsonb not null default '{}'::jsonb;
alter table public.custom_module_logs add column if not exists created_at timestamptz not null default now();

create index if not exists custom_module_logs_restaurant_created_idx
  on public.custom_module_logs (restaurant_id, created_at desc);

create index if not exists custom_module_logs_module_created_idx
  on public.custom_module_logs (custom_module_id, created_at desc);

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.custom_modules enable row level security;
alter table public.custom_module_logs enable row level security;

drop policy if exists "members_can_read_custom_modules" on public.custom_modules;
drop policy if exists "members_can_insert_custom_modules" on public.custom_modules;
drop policy if exists "members_can_update_custom_modules" on public.custom_modules;
drop policy if exists "members_can_delete_custom_modules" on public.custom_modules;

create policy "members_can_read_custom_modules"
  on public.custom_modules
  for select
  using (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_insert_custom_modules"
  on public.custom_modules
  for insert
  with check (
    public.is_member_of_restaurant(restaurant_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy "members_can_update_custom_modules"
  on public.custom_modules
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

create policy "members_can_delete_custom_modules"
  on public.custom_modules
  for delete
  using (
    public.is_member_of_restaurant(restaurant_id)
    and (
      user_id = auth.uid()
      or public.is_owner_of_restaurant(restaurant_id)
    )
  );

drop policy if exists "members_can_read_custom_module_logs" on public.custom_module_logs;
drop policy if exists "members_can_insert_custom_module_logs" on public.custom_module_logs;
drop policy if exists "members_can_update_custom_module_logs" on public.custom_module_logs;
drop policy if exists "members_can_delete_custom_module_logs" on public.custom_module_logs;

create policy "members_can_read_custom_module_logs"
  on public.custom_module_logs
  for select
  using (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_insert_custom_module_logs"
  on public.custom_module_logs
  for insert
  with check (
    public.is_member_of_restaurant(restaurant_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy "members_can_update_custom_module_logs"
  on public.custom_module_logs
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

create policy "members_can_delete_custom_module_logs"
  on public.custom_module_logs
  for delete
  using (
    public.is_member_of_restaurant(restaurant_id)
    and (
      user_id = auth.uid()
      or public.is_owner_of_restaurant(restaurant_id)
    )
  );
