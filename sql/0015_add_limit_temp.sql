-- =========================================================================
-- 0015_add_limit_temp.sql
--
-- Voegt `limit_temp` toe aan haccp_equipments zodat elke koelkast/vriezer
-- een eigen temperatuurlimiet kan hebben.
-- Boven deze waarde moet de medewerker een corrigerende maatregel invullen.
--
-- =========================================================================

alter table public.haccp_equipments
  add column if not exists limit_temp numeric(5,2);
