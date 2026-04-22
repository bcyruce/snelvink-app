-- =========================================================================
-- Trigger: on_auth_user_created
-- Doel   : Bij registratie automatisch een profiel (en eventueel een
--          restaurant) aanmaken op basis van de user_metadata die vanaf
--          de frontend wordt meegestuurd in supabase.auth.signUp.
--
-- Verwachte metadata (options.data):
--   { role: 'eigenaar', restaurant_name: '...' }   -- bij Eigenaar
--   { role: 'staff' }                               -- bij Personeel
--
-- Belangrijk: de doeltabel heet public.restaurants (meervoud).
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role          text := new.raw_user_meta_data ->> 'role';
  v_restaurant    text := new.raw_user_meta_data ->> 'restaurant_name';
  v_restaurant_id uuid;
begin
  if v_role = 'eigenaar' then
    insert into public.restaurants (owner_id, name)
    values (new.id, coalesce(nullif(trim(v_restaurant), ''), 'Mijn restaurant'))
    returning id into v_restaurant_id;

    insert into public.profiles (id, email, role, restaurant_name, restaurant_id)
    values (
      new.id,
      new.email,
      'eigenaar',
      nullif(trim(v_restaurant), ''),
      v_restaurant_id
    );

  elsif v_role = 'staff' then
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'staff');

  else
    -- Fallback: onbekende of ontbrekende rol -> als staff registreren
    insert into public.profiles (id, email, role)
    values (new.id, new.email, coalesce(v_role, 'staff'));
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

grant execute on function public.handle_new_user() to supabase_auth_admin;
