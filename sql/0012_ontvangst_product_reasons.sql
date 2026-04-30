-- =========================================================================
-- 0012_ontvangst_product_reasons.sql
-- Phase 2b: Ontvangst product reasons
--
--   Voegt accept_reasons en reject_reasons kolommen toe aan haccp_products
--   zodat elk product zijn eigen goedgekeurd/afgekeurd redenen kan hebben.
--
-- =========================================================================

alter table public.haccp_products
  add column if not exists accept_reasons text[] not null default ARRAY['Anders'],
  add column if not exists reject_reasons text[] not null default ARRAY['Temperatuur te hoog', 'Verpakking beschadigd', 'THT/TGT verstreken', 'Verkeerd product', 'Kwaliteit onvoldoende', 'Anders'];
