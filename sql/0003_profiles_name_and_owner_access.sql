-- =========================================================================
-- 0003_profiles_name_and_owner_access.sql
-- Doel:
-- 1) Kolom full_name toevoegen aan public.profiles zodat de eigenaar de
--    namen van zijn personeel kan zien.
-- 2) RLS policies toevoegen waarmee de eigenaar van een restaurant alle
--    profielen binnen datzelfde restaurant mag lezen, en staff-profielen
--    mag verwijderen.
-- 3) Trigger handle_new_user() bijwerken zodat full_name uit de user
--    metadata wordt weggeschreven.
-- =========================================================================

-- -----------------------------
-- 1) full_name kolom
-- -----------------------------
alter table public.profiles
  add column if not exists full_name text;

-- Eenmalige backfill: bestaande profielen krijgen een naam op basis van
-- bestaande user metadata of anders het deel voor de @ in het e-mailadres.
update public.profiles p
set full_name = coalesce(
  nullif(trim(p.full_name), ''),
  nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
  split_part(coalesce(p.email, ''), '@', 1)
)
from auth.users u
where u.id = p.id
  and (p.full_name is null or trim(p.full_name) = '');

-- -----------------------------
-- 2) RLS policies voor eigenaar-toegang
-- -----------------------------
alter table public.profiles enable row level security;

-- SELECT: eigenaar mag alle profielen zien van zijn restaurant
drop policy if exists "owners_can_read_restaurant_profiles" on public.profiles;
create policy "owners_can_read_restaurant_profiles"
  on public.profiles
  for select
  using (
    restaurant_id in (
      select r.id
      from public.restaurants r
      where r.owner_id = auth.uid()
    )
  );

-- DELETE: eigenaar mag staff uit zijn eigen restaurant verwijderen.
-- Eigenaar kan zichzelf hiermee niet verwijderen (role = 'staff' filter).
drop policy if exists "owners_can_delete_staff" on public.profiles;
create policy "owners_can_delete_staff"
  on public.profiles
  for delete
  using (
    lower(role) = 'staff'
    and restaurant_id in (
      select r.id
      from public.restaurants r
      where r.owner_id = auth.uid()
    )
  );

-- -----------------------------
-- 3) Trigger function bijwerken met full_name
-- -----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role           text := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', '')));
  v_restaurant     text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'restaurant_name', '')), '');
  v_invite_code    text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '');
  v_full_name      text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  v_restaurant_id  uuid;
  v_plan_type      text;
  v_staff_count    int := 0;
  v_staff_limit    int := 0;
begin
  if v_role = 'eigenaar' then
    insert into public.restaurants (owner_id, name)
    values (
      new.id,
      coalesce(v_restaurant, 'Mijn restaurant')
    )
    returning id into v_restaurant_id;

    insert into public.profiles (id, email, role, restaurant_name, restaurant_id, full_name)
    values (
      new.id,
      new.email,
      'eigenaar',
      v_restaurant,
      v_restaurant_id,
      v_full_name
    );

  elsif v_role = 'staff' then
    if v_invite_code is null then
      raise exception 'Invite code is verplicht voor staff registratie';
    end if;

    select r.id, lower(r.plan_type)
    into v_restaurant_id, v_plan_type
    from public.restaurants r
    where r.invite_code = v_invite_code
    limit 1;

    if v_restaurant_id is null then
      raise exception 'Ongeldige invite code';
    end if;

    v_staff_limit := case v_plan_type
      when 'free' then 0
      when 'basic' then 10
      when 'pro' then 50
      else 0
    end;

    select count(*)
    into v_staff_count
    from public.profiles p
    where p.restaurant_id = v_restaurant_id
      and lower(p.role) = 'staff';

    if v_staff_count >= v_staff_limit then
      raise exception
        'Plan limiet bereikt: plan=% , max staff=%',
        v_plan_type, v_staff_limit;
    end if;

    insert into public.profiles (id, email, role, restaurant_id, full_name)
    values (new.id, new.email, 'staff', v_restaurant_id, v_full_name);

  else
    raise exception 'Ongeldige role in metadata: %', coalesce(v_role, '<null>');
  end if;

  return new;
end;
$$;

grant execute on function public.handle_new_user() to supabase_auth_admin;
