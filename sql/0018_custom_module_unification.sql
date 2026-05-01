-- =========================================================================
-- 0018_custom_module_unification.sql
--
-- Maakt het mogelijk dat aangepaste (custom) modules dezelfde tabellen
-- gebruiken als de standaardmodules:
--   * Getal  → haccp_equipments  (zoals koeling/kerntemperatuur)
--   * Ja/Nee → haccp_products    (zoals ontvangst)
--   * Lijst  → haccp_locations   (zoals schoonmaak)
--
-- Hierdoor kunnen de bestaande componenten letterlijk worden hergebruikt
-- voor zowel de Taken-beheerschermen als de Registreren-flows. Records
-- worden ook in haccp_records opgeslagen, met `custom_module_id` gevuld
-- en `module_type` gelijk aan custom_number / custom_boolean / custom_list.
-- =========================================================================

alter table public.haccp_equipments
  add column if not exists custom_module_id uuid
    references public.custom_modules(id) on delete cascade;
create index if not exists haccp_equipments_custom_module_idx
  on public.haccp_equipments (custom_module_id);
-- type-check verwijderen zodat custom rows een vrije waarde mogen gebruiken
alter table public.haccp_equipments drop constraint if exists haccp_equipments_type_check;

alter table public.haccp_products
  add column if not exists custom_module_id uuid
    references public.custom_modules(id) on delete cascade;
create index if not exists haccp_products_custom_module_idx
  on public.haccp_products (custom_module_id);

alter table public.haccp_locations
  add column if not exists custom_module_id uuid
    references public.custom_modules(id) on delete cascade;
create index if not exists haccp_locations_custom_module_idx
  on public.haccp_locations (custom_module_id);

alter table public.haccp_records
  add column if not exists custom_module_id uuid
    references public.custom_modules(id) on delete cascade;
create index if not exists haccp_records_custom_module_idx
  on public.haccp_records (custom_module_id);

-- module_type uitbreiden met custom_* varianten
alter table public.haccp_records drop constraint if exists haccp_records_module_type_check;
alter table public.haccp_records
  add constraint haccp_records_module_type_check
  check (
    module_type in (
      'koeling','kerntemperatuur','ontvangst','schoonmaak',
      'custom_number','custom_boolean','custom_list'
    )
  );
