-- SAI market-aware pricing catalog
-- Effective: 2026-08-07 | Required review: 2026-11-07
-- Additive only. This migration does not activate unverified thermal capability.

create table if not exists public.sai_pricing_catalog (
  code text primary key,
  name text not null,
  category text not null,
  description text,
  pricing_model text not null
    check (pricing_model in ('fixed', 'starting_at', 'range', 'custom')),
  base_price numeric(10,2),
  minimum_price numeric(10,2),
  maximum_price numeric(10,2),
  unit text,
  included_quantity numeric(10,2),
  overage_rate numeric(10,2),
  target_gross_margin_pct numeric(5,2) not null default 40.00
    check (target_gross_margin_pct >= 0 and target_gross_margin_pct < 100),
  market_low numeric(10,2),
  market_high numeric(10,2),
  benchmark_basis text,
  modifiers jsonb not null default '{}'::jsonb,
  requires_capability text,
  available boolean not null default true,
  public boolean not null default true,
  effective_date date not null,
  review_due_date date not null,
  drone_package_code text references public.drone_packages(code),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (base_price is null or base_price >= 0),
  check (minimum_price is null or minimum_price >= 0),
  check (maximum_price is null or maximum_price >= 0),
  check (maximum_price is null or minimum_price is null or maximum_price >= minimum_price),
  check (included_quantity is null or included_quantity >= 0),
  check (overage_rate is null or overage_rate >= 0),
  check (review_due_date >= effective_date)
);

alter table public.sai_pricing_catalog enable row level security;

drop policy if exists "admins_manage_sai_pricing_catalog" on public.sai_pricing_catalog;
create policy "admins_manage_sai_pricing_catalog"
  on public.sai_pricing_catalog
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "public_reads_active_sai_pricing" on public.sai_pricing_catalog;
create policy "public_reads_active_sai_pricing"
  on public.sai_pricing_catalog
  for select
  to anon
  using (active and public);

revoke all on public.sai_pricing_catalog from anon;
grant select (
  code,
  name,
  category,
  description,
  pricing_model,
  base_price,
  minimum_price,
  maximum_price,
  unit,
  included_quantity,
  overage_rate,
  requires_capability,
  available,
  effective_date,
  review_due_date,
  sort_order
) on public.sai_pricing_catalog to anon;
grant select, insert, update, delete on public.sai_pricing_catalog to authenticated;

drop trigger if exists set_sai_pricing_catalog_updated_at on public.sai_pricing_catalog;
create trigger set_sai_pricing_catalog_updated_at
  before update on public.sai_pricing_catalog
  for each row
  execute function extensions.moddatetime('updated_at');

insert into public.sai_pricing_catalog (
  code,
  name,
  category,
  description,
  pricing_model,
  base_price,
  minimum_price,
  maximum_price,
  unit,
  included_quantity,
  overage_rate,
  target_gross_margin_pct,
  market_low,
  market_high,
  benchmark_basis,
  modifiers,
  requires_capability,
  available,
  public,
  effective_date,
  review_due_date,
  drone_package_code,
  sort_order,
  active
)
values
  ('LISTING_LITE', 'Listing Lite', 'real_estate', '10 aerial photos with next-day delivery.', 'fixed', 225.00, 225.00, 225.00, 'project', 1.00, null, 40.00, 149.00, 250.00, '2026 Hampton Roads competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', 'LISTING_LITE_225', 10, true),
  ('LISTING_PRO', 'Listing Pro', 'real_estate', '25 aerial photos and a 60-second video.', 'fixed', 450.00, 450.00, 450.00, 'project', 1.00, null, 40.00, 205.00, 450.00, '2026 Hampton Roads competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', 'LISTING_PRO_450', 20, true),
  ('LUXURY_LISTING', 'Luxury Listing', 'real_estate', 'Premium aerial photo and cinematic video package.', 'fixed', 750.00, 750.00, 750.00, 'project', 1.00, null, 40.00, 700.00, 825.00, '2026 Hampton Roads competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', 'LUXURY_750', 30, true),
  ('BROKERAGE_RETAINER', 'Brokerage Retainer', 'real_estate', 'Five Listing Pro shoots per month; use it or lose it.', 'fixed', 1800.00, 1800.00, 1800.00, 'month', 5.00, null, 40.00, null, null, '20 percent volume discount with protected callout floor', '{}'::jsonb, null, true, false, DATE '2026-08-07', DATE '2026-11-07', null, 40, true),
  ('CONSTRUCTION_RECURRING', 'Construction Progress - Recurring', 'construction', 'Scheduled repeat visual progress documentation.', 'fixed', 450.00, 450.00, 450.00, 'visit', 1.00, null, 40.00, 399.00, 475.00, '2026 regional recurring-progress competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', 'CONSTRUCTION_450', 50, true),
  ('CONSTRUCTION_ONE_TIME', 'Construction Progress - One-Time', 'construction', 'One-time visual progress documentation visit.', 'fixed', 550.00, 550.00, 550.00, 'visit', 1.00, null, 40.00, 499.00, 700.00, '2026 regional one-time progress competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', null, 60, true),
  ('CONSTRUCTION_MAPPING', 'Construction Mapping', 'construction', 'Construction-oriented orthomosaic documentation.', 'starting_at', 750.00, 750.00, null, 'project', null, null, 40.00, 499.00, 900.00, '2026 construction mapping competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', null, 70, true),
  ('CONSTRUCTION_ANALYSIS', 'Construction Analysis', 'construction', 'Scope-dependent analysis and documentation report.', 'range', 950.00, 950.00, 1200.00, 'project', null, null, 40.00, 950.00, 1400.00, '2026 analysis and reporting competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', null, 80, true),
  ('COMMERCIAL_MARKETING', 'Commercial Marketing', 'commercial', 'Commercial aerial stills and video; final scope determines price.', 'starting_at', 850.00, 850.00, null, 'project', null, null, 40.00, 400.00, 1200.00, '2026 regional commercial aerial competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', 'COMMERCIAL_850', 90, true),
  ('ROOF_RESIDENTIAL_VISUAL', 'Residential Visual Roof Documentation', 'inspection', 'High-resolution visual roof documentation; no certification or engineering conclusion.', 'range', 550.00, 450.00, 650.00, 'property', 1.00, null, 40.00, 395.00, 650.00, '2026 Virginia and national visual roof review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', null, 100, true),
  ('ROOF_COMMERCIAL_VISUAL', 'Commercial Visual Roof Documentation', 'inspection', 'Commercial visual roof documentation; no certification or engineering conclusion.', 'starting_at', 750.00, 750.00, null, 'property', 1.00, null, 40.00, 600.00, 1200.00, '2026 commercial visual roof review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', null, 110, true),
  ('ROOF_COMMERCIAL_THERMAL', 'Commercial Thermal Roof Documentation', 'inspection', 'Thermal roof documentation, gated until verified thermal capability is active.', 'starting_at', 1200.00, 1200.00, null, 'property', 1.00, null, 40.00, 1200.00, 3500.00, '2026 commercial thermal roof review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, 'thermal', false, true, DATE '2026-08-07', DATE '2026-11-07', 'ROOF_INSPECTION', 120, true),
  ('MAPPING_BASIC', 'Mapping Basic', 'mapping', 'Orthomosaic and point cloud up to 10 acres.', 'starting_at', 800.00, 800.00, null, 'project', 10.00, 14.00, 40.00, 650.00, 1200.00, '2026 small-site mapping competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', null, 130, true),
  ('MAPPING_PRO', 'Mapping Pro', 'mapping', 'Mapping with measurements, annotations, and CAD exports up to 25 acres.', 'starting_at', 1800.00, 1800.00, null, 'project', 25.00, 22.00, 40.00, 1200.00, 2500.00, '2026 advanced mapping competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', null, 140, true),
  ('MAPPING_ENTERPRISE', 'Mapping Enterprise', 'mapping', 'Custom reporting, change detection, and priority handling.', 'starting_at', 3500.00, 3500.00, null, 'project', null, null, 40.00, 3500.00, 5500.00, '2026 enterprise mapping competitor review', '{"manual_authorization":250,"next_day":0.25,"same_day":0.5}'::jsonb, null, true, true, DATE '2026-08-07', DATE '2026-11-07', null, 150, true),
  ('ROUTINE_LAANC', 'Routine LAANC', 'airspace', 'Routine automated LAANC coordination is included.', 'fixed', 0.00, 0.00, 0.00, 'authorization', 1.00, null, 40.00, 0.00, 0.00, 'Routine automated authorization is commonly bundled', '{}'::jsonb, null, true, false, DATE '2026-08-07', DATE '2026-11-07', null, 160, true),
  ('MANUAL_AIRSPACE_COORDINATION', 'Manual Airspace Coordination', 'airspace', 'Zero-grid, CAPS, or further manual authorization coordination.', 'fixed', 250.00, 250.00, 250.00, 'authorization', 1.00, null, 40.00, 200.00, 300.00, 'Manual coordination benchmark', '{}'::jsonb, null, true, false, DATE '2026-08-07', DATE '2026-11-07', null, 170, true)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  pricing_model = excluded.pricing_model,
  base_price = excluded.base_price,
  minimum_price = excluded.minimum_price,
  maximum_price = excluded.maximum_price,
  unit = excluded.unit,
  included_quantity = excluded.included_quantity,
  overage_rate = excluded.overage_rate,
  target_gross_margin_pct = excluded.target_gross_margin_pct,
  market_low = excluded.market_low,
  market_high = excluded.market_high,
  benchmark_basis = excluded.benchmark_basis,
  modifiers = excluded.modifiers,
  requires_capability = excluded.requires_capability,
  available = excluded.available,
  public = excluded.public,
  effective_date = excluded.effective_date,
  review_due_date = excluded.review_due_date,
  drone_package_code = excluded.drone_package_code,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

create or replace view public.sai_public_pricing_catalog
with (security_invoker = true)
as
select
  code,
  name,
  category,
  description,
  pricing_model,
  base_price,
  minimum_price,
  maximum_price,
  unit,
  included_quantity,
  overage_rate,
  requires_capability,
  available,
  effective_date,
  review_due_date,
  sort_order
from public.sai_pricing_catalog
where active and public;

revoke all on public.sai_public_pricing_catalog from public;
grant select on public.sai_public_pricing_catalog to anon, authenticated;

alter table public.mission_costings
  add column if not exists pricing_rule_code text references public.sai_pricing_catalog(code),
  add column if not exists cost_floor numeric(10,2),
  add column if not exists market_price numeric(10,2),
  add column if not exists recommended_quote numeric(10,2),
  add column if not exists quote_id uuid references public.quotes(id),
  add column if not exists actual_labor_cost numeric(10,2),
  add column if not exists actual_direct_expenses numeric(10,2),
  add column if not exists actual_total_cost numeric(10,2),
  add column if not exists realized_gross_margin_pct numeric(7,2)
    generated always as (
      case
        when recommended_quote is null or recommended_quote = 0 or actual_total_cost is null then null
        else round(((recommended_quote - actual_total_cost) / recommended_quote) * 100, 2)
      end
    ) stored;

comment on column public.costing_settings.default_margin_pct is
  'Default target gross margin percentage. Quote floor = true cost / (1 - margin).';
comment on column public.mission_costings.margin_pct is
  'Target gross margin percentage, not markup percentage.';

update public.drone_packages
set price = 225.00,
    description = 'Listing Lite - 10 aerial photos with next-day delivery',
    updated_at = now()
where code = 'LISTING_LITE_225';

update public.drone_packages
set price = 450.00,
    description = 'Listing Pro - aerial photos and 60-second video',
    updated_at = now()
where code = 'LISTING_PRO_450';

update public.drone_packages
set price = 750.00,
    description = 'Luxury Listing - premium aerial photo and cinematic video',
    updated_at = now()
where code = 'LUXURY_750';

update public.drone_packages
set price = 450.00,
    name = 'Construction Progress - Recurring',
    description = 'Scheduled repeat visual progress documentation per visit',
    updated_at = now()
where code = 'CONSTRUCTION_450';

update public.drone_packages
set price = 850.00,
    description = 'Commercial aerial marketing starting at $850; final scope determines price',
    updated_at = now()
where code = 'COMMERCIAL_850';

update public.drone_packages
set price = 1200.00,
    name = 'Commercial Thermal Roof Documentation',
    description = 'Capability-gated thermal roof documentation; unavailable until thermal capability is verified',
    requires_thermal = true,
    active = false,
    updated_at = now()
where code = 'ROOF_INSPECTION';
