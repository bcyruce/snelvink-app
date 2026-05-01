-- =========================================================================
-- 0016_add_correction_action.sql
--
-- Voegt `correction_action` toe aan haccp_records. Wanneer de gemeten
-- temperatuur boven `limit_temp` van het apparaat ligt, moet de medewerker
-- een corrigerende maatregel invullen. Deze tekst wordt samen met de
-- temperatuur opgeslagen en zichtbaar in de detail-/historie-weergave.
-- =========================================================================

alter table public.haccp_records
  add column if not exists correction_action text;
