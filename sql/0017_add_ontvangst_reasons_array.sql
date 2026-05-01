-- =========================================================================
-- 0017_add_ontvangst_reasons_array.sql
--
-- Voegt een `reasons text[]` kolom toe aan haccp_records zodat ontvangst
-- meerdere redenen tegelijk kan opslaan (zowel bij goedkeuring als bij
-- afkeuring). De bestaande `reason text` kolom blijft bewaard voor
-- backwards-compat met oudere historie-rijen.
-- =========================================================================

alter table public.haccp_records
  add column if not exists reasons text[] not null default '{}'::text[];
