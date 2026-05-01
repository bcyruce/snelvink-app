-- =========================================================================
-- 0019_custom_boolean_reasons_default.sql
--
-- Aangepaste Ja/Nee-items horen zonder ontvangst-specifieke redenen te
-- starten. Bestaande custom rows die exact de oude ontvangst-default hebben
-- gekregen, worden teruggezet naar alleen "Anders".
-- =========================================================================

update public.haccp_products
set reject_reasons = ARRAY['Anders']::text[]
where custom_module_id is not null
  and reject_reasons = ARRAY[
    'Temperatuur te hoog',
    'Verpakking beschadigd',
    'THT/TGT verstreken',
    'Verkeerd product',
    'Kwaliteit onvoldoende',
    'Anders'
  ]::text[];
