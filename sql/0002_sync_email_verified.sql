-- =========================================================================
-- Trigger: on_auth_user_email_confirmed
-- Doel   : Zodra Supabase Auth het veld email_confirmed_at invult (nadat de
--          gebruiker op de bevestigingslink heeft geklikt), synchroniseren
--          we dit naar public.profiles.is_email_verified. Zo verdwijnt de
--          gele "E-mailadres nog niet geverifieerd"-banner in de app
--          automatisch.
--
-- Werking:
--   * We triggeren na UPDATE op auth.users.
--   * We reageren alleen wanneer email_confirmed_at wisselt van NULL naar
--     een waarde (eerste bevestiging). Latere wijzigingen (bv. e-mailadres
--     wijzigen en opnieuw bevestigen) worden ook afgevangen door
--     `is distinct from`.
-- =========================================================================

create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is distinct from new.email_confirmed_at) then
    update public.profiles
       set is_email_verified = true,
           email              = new.email
     where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

grant execute on function public.handle_user_email_confirmed() to supabase_auth_admin;

-- Optioneel: bestaande accounts die in auth al bevestigd zijn maar waarvan
-- het profiel nog op false staat meteen bijwerken.
update public.profiles p
   set is_email_verified = true
  from auth.users u
 where u.id = p.id
   and u.email_confirmed_at is not null
   and p.is_email_verified is distinct from true;
