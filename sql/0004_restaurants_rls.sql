-- =========================================================================
-- 0004_restaurants_rls.sql
-- Doel:
-- RLS policies op public.restaurants zodat ingelogde gebruikers hun eigen
-- restaurant (eigenaar) of het restaurant waaraan ze gekoppeld zijn (staff)
-- kunnen lezen. Zonder deze policies retourneert de geneste query
-- `profiles.select("..., restaurants(...)")` niets en ziet de UI geen
-- plan_type of invite_code.
-- =========================================================================

alter table public.restaurants enable row level security;

-- Eigenaar: lezen van de eigen restaurant-row (owner_id = uid).
drop policy if exists "owners_can_read_own_restaurant" on public.restaurants;
create policy "owners_can_read_own_restaurant"
  on public.restaurants
  for select
  using (owner_id = auth.uid());

-- Staff: lezen van het restaurant waar zijn profiel aan gekoppeld is.
drop policy if exists "staff_can_read_own_restaurant" on public.restaurants;
create policy "staff_can_read_own_restaurant"
  on public.restaurants
  for select
  using (
    id in (
      select p.restaurant_id
      from public.profiles p
      where p.id = auth.uid()
    )
  );

-- Eigenaar mag zijn eigen restaurant-row updaten (bv. naam of plan_type
-- via een toekomstige upgrade-flow). Staff niet.
drop policy if exists "owners_can_update_own_restaurant" on public.restaurants;
create policy "owners_can_update_own_restaurant"
  on public.restaurants
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
