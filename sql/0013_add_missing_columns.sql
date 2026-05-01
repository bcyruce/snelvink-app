-- =========================================================================
-- 0013_add_missing_columns.sql
--
-- Herstel ontbrekende kolommen die door de app-code worden geschreven
-- maar niet in de database bestonden. Dit veroorzaakte 400 Bad Request
-- bij alle opsla-operaties (koeling, kerntemperatuur, ontvangst,
-- schoonmaak, custom modules).
--
-- 1) opmerking      tekstveld op haccp_records        (alle registraties)
-- 2) logged_at      timestamp op custom_module_logs    (custom registraties)
--
-- =========================================================================

-- 1) Opmerking kolom voor alle HACCP records
alter table public.haccp_records
  add column if not exists opmerking text;

-- 2) logged_at kolom voor custom module logs
alter table public.custom_module_logs
  add column if not exists logged_at timestamptz;
