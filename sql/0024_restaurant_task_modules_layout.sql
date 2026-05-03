-- =========================================================================
-- 0024_restaurant_task_modules_layout.sql
-- Sla de taken-tegels (volgorde + custom modules) per restaurant op zodat
-- alle apparaten/browsers dezelfde layout zien (niet alleen localStorage).
-- =========================================================================

create table if not exists public.restaurant_task_modules_layout (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  modules         jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);

create index if not exists restaurant_task_modules_layout_updated_at_idx
  on public.restaurant_task_modules_layout (updated_at desc);

alter table public.restaurant_task_modules_layout enable row level security;

-- SELECT: ingelogde gebruiker met gekoppeld restaurant (eigenaar of staff)
drop policy if exists "users_read_restaurant_task_layout" on public.restaurant_task_modules_layout;
create policy "users_read_restaurant_task_layout"
  on public.restaurant_task_modules_layout
  for select
  using (
    restaurant_id in (
      select p.restaurant_id
      from public.profiles p
      where p.id = auth.uid()
        and p.restaurant_id is not null
    )
  );

drop policy if exists "users_insert_restaurant_task_layout" on public.restaurant_task_modules_layout;
create policy "users_insert_restaurant_task_layout"
  on public.restaurant_task_modules_layout
  for insert
  with check (
    restaurant_id in (
      select p.restaurant_id
      from public.profiles p
      where p.id = auth.uid()
        and p.restaurant_id is not null
    )
  );

drop policy if exists "users_update_restaurant_task_layout" on public.restaurant_task_modules_layout;
create policy "users_update_restaurant_task_layout"
  on public.restaurant_task_modules_layout
  for update
  using (
    restaurant_id in (
      select p.restaurant_id
      from public.profiles p
      where p.id = auth.uid()
        and p.restaurant_id is not null
    )
  )
  with check (
    restaurant_id in (
      select p.restaurant_id
      from public.profiles p
      where p.id = auth.uid()
        and p.restaurant_id is not null
    )
  );

grant select, insert, update on public.restaurant_task_modules_layout to authenticated;
