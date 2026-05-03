-- =========================================================================
-- 0022_custom_correction_rules_and_number_range.sql
--
-- Custom Ja/Nee:
--   - per item instelbaar of "afgekeurd" een corrigerende maatregel verplicht maakt.
--
-- Custom Getal:
--   - per item instelbaar bereik (min/max).
--   - per item instelbaar of buiten bereik een corrigerende maatregel verplicht maakt.
-- =========================================================================

alter table public.haccp_products
  add column if not exists require_correction_on_reject boolean not null default false;

alter table public.haccp_equipments
  add column if not exists min_value numeric(10,2),
  add column if not exists max_value numeric(10,2),
  add column if not exists require_correction_out_of_range boolean not null default false;

-- Bestaande custom getal-items met alleen `limit_temp` krijgen dat als
-- initiële bovengrens, zodat ingestelde grenzen niet verloren gaan.
update public.haccp_equipments
set max_value = limit_temp
where custom_module_id is not null
  and max_value is null
  and limit_temp is not null;
