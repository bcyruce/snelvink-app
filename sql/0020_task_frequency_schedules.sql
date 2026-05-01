-- =========================================================================
-- 0020_task_frequency_schedules.sql
--
-- Slaat periodieke taken op bij de configureerbare items en bewaart stabiele
-- item-referenties in haccp_records voor herinnerings-tellingen.
-- =========================================================================

alter table public.haccp_equipments
  add column if not exists schedule jsonb;

alter table public.haccp_products
  add column if not exists schedule jsonb;

alter table public.haccp_locations
  add column if not exists schedule jsonb;

alter table public.haccp_records
  add column if not exists product_id uuid
    references public.haccp_products(id) on delete set null,
  add column if not exists location_id uuid
    references public.haccp_locations(id) on delete set null;

create index if not exists haccp_records_product_recorded_idx
  on public.haccp_records (product_id, recorded_at);

create index if not exists haccp_records_location_recorded_idx
  on public.haccp_records (location_id, recorded_at);
