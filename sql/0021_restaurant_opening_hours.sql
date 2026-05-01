-- =========================================================================
-- 0021_restaurant_opening_hours.sql
--
-- Slaat openingstijden en sluitingsdagen op bij het restaurant. De bestaande
-- RLS-policy laat alleen eigenaren hun restaurant bijwerken.
-- =========================================================================

alter table public.restaurants
  add column if not exists opening_hours jsonb,
  add column if not exists closed_days jsonb not null default '[]'::jsonb;
