-- =========================================================================
-- 0005_fix_rls_recursion.sql
-- Doel:
-- De policies uit 0003 (profiles) en 0004 (restaurants) verwezen naar
-- elkaars tabel, wat een RLS-recursie veroorzaakte
-- ("infinite recursion detected in policy for relation restaurants").
--
-- We verplaatsen de relatie-checks naar SECURITY DEFINER helpers. Binnen
-- een SECURITY DEFINER functie wordt RLS genegeerd, dus zo hebben de
-- policies geen wederzijdse afhankelijkheid meer.
-- =========================================================================

-- -----------------------------
-- Helper functions (bypass RLS)
-- -----------------------------
create or replace function public.is_owner_of_restaurant(rest_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.id = rest_id
      and r.owner_id = auth.uid()
  );
$$;

create or replace function public.is_member_of_restaurant(rest_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.restaurant_id = rest_id
  );
$$;

grant execute on function public.is_owner_of_restaurant(uuid)
  to authenticated, anon;
grant execute on function public.is_member_of_restaurant(uuid)
  to authenticated, anon;

-- -----------------------------
-- profiles: eigenaar leest / verwijdert medewerkers via helper
-- -----------------------------
drop policy if exists "owners_can_read_restaurant_profiles" on public.profiles;
create policy "owners_can_read_restaurant_profiles"
  on public.profiles
  for select
  using (public.is_owner_of_restaurant(restaurant_id));

drop policy if exists "owners_can_delete_staff" on public.profiles;
create policy "owners_can_delete_staff"
  on public.profiles
  for delete
  using (
    lower(role) = 'staff'
    and public.is_owner_of_restaurant(restaurant_id)
  );

-- -----------------------------
-- restaurants: staff leest eigen restaurant via helper
-- -----------------------------
drop policy if exists "staff_can_read_own_restaurant" on public.restaurants;
create policy "staff_can_read_own_restaurant"
  on public.restaurants
  for select
  using (public.is_member_of_restaurant(id));

-- owners_can_read_own_restaurant uit 0004 hoeft niet veranderd te worden:
-- die gebruikt alleen owner_id = auth.uid() en heeft geen recursie.
