-- =========================================================================
-- 0001_handle_new_user_trigger.sql
-- Doel:
-- 1) restaurants uitbreiden met invite_code + plan_type
-- 2) invite_code automatisch genereren (6 cijfers, uniek)
-- 3) auth trigger uitbreiden voor eigenaar/staff inclusief plan-limieten
--
-- Verwachte metadata vanuit signUp(options.data):
--   Eigenaar: { role: 'eigenaar', restaurant_name: '...' }
--   Staff   : { role: 'staff', invite_code: '123456' }
-- =========================================================================

-- -----------------------------
-- 1) Helper: unieke 6-cijferige invite code
-- -----------------------------
create or replace function public.generate_unique_invite_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  v_code text;
  v_exists boolean;
  v_try int := 0;
begin
  loop
    v_try := v_try + 1;
    if v_try > 30 then
      raise exception 'Kon geen unieke invite code genereren na % pogingen', v_try;
    end if;

    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    select exists(
      select 1 from public.restaurants r where r.invite_code = v_code
    ) into v_exists;

    exit when not v_exists;
  end loop;

  return v_code;
end;
$$;

-- -----------------------------
-- 2) restaurants: benodigde kolommen + constraints
-- -----------------------------
alter table public.restaurants
  add column if not exists invite_code text,
  add column if not exists plan_type text;

alter table public.restaurants
  alter column plan_type set default 'free';

update public.restaurants
set plan_type = coalesce(nullif(trim(plan_type), ''), 'free')
where plan_type is null or trim(plan_type) = '';

alter table public.restaurants
  alter column plan_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_plan_type_check'
  ) then
    alter table public.restaurants
      add constraint restaurants_plan_type_check
      check (lower(plan_type) in ('free', 'basic', 'pro'));
  end if;
end;
$$;

alter table public.restaurants
  alter column invite_code set default public.generate_unique_invite_code();

update public.restaurants
set invite_code = public.generate_unique_invite_code()
where invite_code is null
   or invite_code !~ '^[0-9]{6}$';

alter table public.restaurants
  alter column invite_code set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_invite_code_format_check'
  ) then
    alter table public.restaurants
      add constraint restaurants_invite_code_format_check
      check (invite_code ~ '^[0-9]{6}$');
  end if;
end;
$$;

create unique index if not exists restaurants_invite_code_key
  on public.restaurants (invite_code);

-- -----------------------------
-- 3) Trigger function: nieuwe user afhandelen
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant execute on function public.handle_new_user() to supabase_auth_admin;
