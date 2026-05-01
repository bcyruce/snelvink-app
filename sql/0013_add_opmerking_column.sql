-- =========================================================================
-- 0013_add_opmerking_column.sql
--
-- Voegt de ontbrekende `opmerking` tekstkolom toe aan haccp_records.
-- Alle registratie-flows (koeling, kerntemperatuur, ontvangst, schoonmaak)
-- schrijven deze kolom, maar de kolom bestond niet in de database.
--
-- =========================================================================

alter table public.haccp_records
  add column if not exists opmerking text;
