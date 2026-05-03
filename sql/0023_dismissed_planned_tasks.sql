-- =========================================================================
-- 0023_dismissed_planned_tasks.sql
--
-- Houdt bij welke geplande taken (uit haccp_equipments / haccp_products /
-- haccp_locations met een schedule) door een gebruiker handmatig zijn
-- "afgevinkt" zonder dat er een echte registratie wordt aangemaakt.
--
-- Doel: in de geschiedenis kan een gebruiker een lijst zien van geplande
-- taken die in het verleden niet zijn voltooid. Daar kan men ze
-- afvinken zodat ze niet meer in de lijst van onvoltooide taken
-- verschijnen. Belangrijk: dit voegt GEEN echte haccp_record toe.
--
-- Een rij in deze tabel staat voor één occurrence: combinatie van
-- (item_kind, item_id, occurrence_date, occurrence_time).
-- =========================================================================

create table if not exists public.dismissed_planned_tasks (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references public.restaurants(id) on delete cascade,
  user_id           uuid references auth.users(id) on delete set null,
  item_kind         text not null check (item_kind in ('equipment', 'product', 'location')),
  item_id           uuid not null,
  occurrence_date   date not null,
  occurrence_time   text,
  dismissed_at      timestamptz not null default now()
);

-- Eén occurrence kan maar één keer afgevinkt worden per restaurant.
-- We gebruiken coalesce zodat null vs. lege tijd consistent is.
create unique index if not exists dismissed_planned_tasks_unique_occurrence_idx
  on public.dismissed_planned_tasks (
    restaurant_id,
    item_kind,
    item_id,
    occurrence_date,
    coalesce(occurrence_time, '')
  );

create index if not exists dismissed_planned_tasks_restaurant_date_idx
  on public.dismissed_planned_tasks (restaurant_id, occurrence_date desc);

alter table public.dismissed_planned_tasks enable row level security;

drop policy if exists "members_can_read_dismissed_tasks"   on public.dismissed_planned_tasks;
drop policy if exists "members_can_insert_dismissed_tasks" on public.dismissed_planned_tasks;
drop policy if exists "members_can_delete_dismissed_tasks" on public.dismissed_planned_tasks;

create policy "members_can_read_dismissed_tasks"
  on public.dismissed_planned_tasks
  for select
  using (public.is_member_of_restaurant(restaurant_id));

create policy "members_can_insert_dismissed_tasks"
  on public.dismissed_planned_tasks
  for insert
  with check (
    public.is_member_of_restaurant(restaurant_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy "members_can_delete_dismissed_tasks"
  on public.dismissed_planned_tasks
  for delete
  using (
    public.is_member_of_restaurant(restaurant_id)
    and (
      user_id = auth.uid()
      or public.is_owner_of_restaurant(restaurant_id)
    )
  );
