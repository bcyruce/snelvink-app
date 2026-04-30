-- =========================================================================
-- 0011_haccp_equipment_defaults.sql
-- Optionele standaardwaarde per apparaat (bewerk-scherm Koeling / Kerntemperatuur).
-- Zonder deze kolommen faalt PostgREST bij select/update met onbekende kolommen.
-- =========================================================================

alter table public.haccp_equipments add column if not exists default_temp numeric(5,2);
alter table public.haccp_equipments add column if not exists unit text;
alter table public.haccp_equipments add column if not exists step numeric(5,2);
