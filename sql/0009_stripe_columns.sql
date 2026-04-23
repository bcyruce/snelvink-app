-- =========================================================================
-- 0009_stripe_columns.sql
-- Stripe Phase 1 – kolommen voor abonnementen op restaurants.
--
--   * stripe_customer_id      – Stripe Customer (cus_...)
--   * stripe_subscription_id  – Stripe Subscription (sub_...)
--   * plan                    – 'free' | 'basic' | 'pro'  (canonieke status)
--   * plan_status             – 'active' | 'canceled' | 'past_due' | ...
--   * plan_period_end         – einde huidige betaalperiode
--
--   Het bestaande kolommetje `plan_type` laten we staan voor achterwaartse
--   compatibiliteit en backfillen we één keer naar `plan`. Nieuwe code
--   gebruikt `plan`.
--
--   Unieke identifiers worden met een partiële unique index afgedwongen
--   zodat meerdere rijen tegelijk NULL mogen zijn (nog niet gekoppeld).
-- =========================================================================

-- 1) Stripe IDs
alter table public.restaurants
  add column if not exists stripe_customer_id     text;
alter table public.restaurants
  add column if not exists stripe_subscription_id text;

create unique index if not exists restaurants_stripe_customer_id_key
  on public.restaurants (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists restaurants_stripe_subscription_id_key
  on public.restaurants (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- 2) plan + status + period_end
alter table public.restaurants
  add column if not exists plan            text;
alter table public.restaurants
  add column if not exists plan_status     text;
alter table public.restaurants
  add column if not exists plan_period_end timestamptz;

-- Backfill: neem waarde uit plan_type als die er al is, anders 'free'.
update public.restaurants
   set plan = coalesce(plan, plan_type, 'free')
 where plan is null;

-- Nu kan de kolom not null + default krijgen.
alter table public.restaurants
  alter column plan set default 'free',
  alter column plan set not null;

-- Check-constraints (drop-if-exists voor idempotentie).
alter table public.restaurants
  drop constraint if exists restaurants_plan_check;
alter table public.restaurants
  add constraint restaurants_plan_check
  check (plan in ('free', 'basic', 'pro'));

alter table public.restaurants
  drop constraint if exists restaurants_plan_status_check;
alter table public.restaurants
  add constraint restaurants_plan_status_check
  check (
    plan_status is null
    or plan_status in (
      'active',
      'trialing',
      'canceled',
      'past_due',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused'
    )
  );

-- Handige index voor webhook-lookups (wordt vanaf Phase 2 gebruikt).
create index if not exists restaurants_plan_idx on public.restaurants (plan);
