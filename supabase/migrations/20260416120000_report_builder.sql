-- Report Builder: job_reports + report_images tables
-- Wildlife census is the master template (all sections); other services are subsets.

-- Enum for report status
create type public.report_status as enum ('draft', 'final', 'archived');

-- Master section registry — every possible section a report can contain.
-- Templates enable subsets of these via their sections_manifest JSONB.
create type public.report_section_key as enum (
  'cover_page',
  'executive_summary',
  'methodology',
  'equipment',
  'flight_data',
  'weather_conditions',
  'findings',
  'species_table',
  'population_estimate',
  'confidence_interval',
  'detection_heatmap',
  'transect_map',
  'annotated_imagery',
  'change_detection',
  'anomaly_log',
  'volumetrics',
  'deliverables_manifest',
  'appendix_flight_logs',
  'appendix_raw_data'
);

-- Report templates: each service line gets one row.
-- sections_manifest lists which sections are active + their display order.
create table public.report_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- e.g. 'wildlife_census'
  name text not null,                     -- display name
  description text,
  service_type text not null,             -- maps to drone_jobs.property_type or service line
  sections_manifest jsonb not null,       -- ordered array of { key, label, required, default_content }
  brand_config jsonb default '{}'::jsonb, -- overrides for brand colors, logo, etc.
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Job reports: one report per drone job (or standalone).
create table public.job_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.drone_jobs(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  template_id uuid references public.report_templates(id) on delete restrict not null,
  generated_document_id uuid references public.generated_documents(id) on delete set null,

  status public.report_status default 'draft' not null,
  title text not null,                    -- "Wildlife Census Report — Back Bay NWR"

  -- Per-section data stored as JSONB keyed by section_key.
  -- e.g. { "cover_page": { "title": "...", ... }, "findings": [ ... ] }
  section_data jsonb default '{}'::jsonb not null,

  -- Which sections are enabled for THIS report (can override template defaults)
  active_sections text[] default '{}',

  -- Metadata
  report_date date default current_date,
  prepared_by text default 'Adam Pierce, Founder',
  classification text default 'CLIENT CONFIDENTIAL',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Report images: attached to specific sections of a report.
create table public.report_images (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.job_reports(id) on delete cascade not null,
  section_key public.report_section_key not null,
  image_url text not null,
  thumbnail_url text,
  caption text,
  sort_order integer default 0,
  metadata jsonb default '{}'::jsonb,     -- width, height, gps, etc.
  created_at timestamptz default now()
);

-- Indexes
create index idx_job_reports_job_id on public.job_reports(job_id);
create index idx_job_reports_client_id on public.job_reports(client_id);
create index idx_job_reports_status on public.job_reports(status);
create index idx_job_reports_template_id on public.job_reports(template_id);
create index idx_report_images_report_id on public.report_images(report_id);
create index idx_report_images_section on public.report_images(report_id, section_key);

-- Updated_at triggers
create trigger set_updated_at_report_templates
  before update on public.report_templates
  for each row execute function public.set_updated_at();

create trigger set_updated_at_job_reports
  before update on public.job_reports
  for each row execute function public.set_updated_at();

-- RLS
alter table public.report_templates enable row level security;
alter table public.job_reports enable row level security;
alter table public.report_images enable row level security;

-- Admin-only policies (matches drone_jobs pattern)
create policy "Admins can manage report templates"
  on public.report_templates for all
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage job reports"
  on public.job_reports for all
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage report images"
  on public.report_images for all
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SEED: 10 report templates
-- Wildlife Census has ALL 19 sections. Others are subsets.
-- ============================================================

insert into public.report_templates (code, name, description, service_type, sections_manifest) values

-- 1. WILDLIFE CENSUS (master — all 19 sections)
('wildlife_census', 'Thermal Wildlife Census Report', 'Comprehensive population survey with species counts, detection maps, statistical analysis, and methodology suitable for grant compliance.', 'wildlife_census', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Executive Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment & Aircraft","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":true},
  {"key":"findings","label":"Survey Findings","required":true},
  {"key":"species_table","label":"Species Breakdown","required":true},
  {"key":"population_estimate","label":"Population Estimate","required":true},
  {"key":"confidence_interval","label":"Statistical Confidence","required":true},
  {"key":"detection_heatmap","label":"Detection Heatmap","required":false},
  {"key":"transect_map","label":"Transect / Flight Path Map","required":false},
  {"key":"annotated_imagery","label":"Annotated Imagery","required":true},
  {"key":"change_detection","label":"Change Detection (Prior Survey)","required":false},
  {"key":"anomaly_log","label":"Anomaly Log","required":false},
  {"key":"volumetrics","label":"Volumetric Analysis","required":false},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true},
  {"key":"appendix_raw_data","label":"Appendix: Raw Data Links","required":false}
]'::jsonb),

-- 2. REAL ESTATE AERIAL PHOTOGRAPHY
('re_aerial_photography', 'Real Estate Aerial Photography Report', 'Listing photo delivery report with property overview, image manifest, and delivery confirmation.', 're_aerial', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Property Overview","required":true},
  {"key":"methodology","label":"Methodology","required":false},
  {"key":"equipment","label":"Equipment","required":false},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":false},
  {"key":"annotated_imagery","label":"Hero Shots & Aerials","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":false}
]'::jsonb),

-- 3. ROOF & PROPERTY INSPECTION
('roof_property_inspection', 'Roof & Property Inspection Report', 'Structural inspection with annotated damage findings, severity ratings, and recommended actions.', 'roof_inspection', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Inspection Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":true},
  {"key":"findings","label":"Inspection Findings","required":true},
  {"key":"annotated_imagery","label":"Annotated Imagery","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
]'::jsonb),

-- 4. CONSTRUCTION PROGRESS MAPPING
('construction_progress', 'Construction Progress Report', 'Site documentation with volumetrics, change detection, and progress comparisons.', 'construction', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Progress Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":true},
  {"key":"findings","label":"Site Observations","required":true},
  {"key":"change_detection","label":"Progress Comparison","required":true},
  {"key":"volumetrics","label":"Volumetric Analysis","required":true},
  {"key":"annotated_imagery","label":"Site Imagery","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
]'::jsonb),

-- 5. SOLAR FARM MAPPING
('solar_farm_mapping', 'Solar Farm Inspection Report', 'Thermal panel fault detection with anomaly mapping and severity classification.', 'solar', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Inspection Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":true},
  {"key":"findings","label":"Panel Fault Findings","required":true},
  {"key":"anomaly_log","label":"Anomaly Log","required":true},
  {"key":"annotated_imagery","label":"Thermal & RGB Imagery","required":true},
  {"key":"detection_heatmap","label":"Fault Heatmap","required":false},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
]'::jsonb),

-- 6. LAND LISTING AERIAL
('land_listing_aerial', 'Land Listing Aerial Report', 'Rural property aerial package with ortho preview, boundary overlay, and parcel data.', 'land_listing', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Property Overview","required":true},
  {"key":"methodology","label":"Methodology","required":false},
  {"key":"equipment","label":"Equipment","required":false},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":false},
  {"key":"annotated_imagery","label":"Aerial Imagery & Ortho","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true}
]'::jsonb),

-- 7. CORRECTIONS PERIMETER INSPECTION
('corrections_perimeter', 'Corrections Perimeter Inspection Report', 'Fence line inspection with change detection, breach indicators, and thermal findings.', 'corrections', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Inspection Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":true},
  {"key":"findings","label":"Perimeter Findings","required":true},
  {"key":"change_detection","label":"Change Detection","required":true},
  {"key":"anomaly_log","label":"Breach Indicator Log","required":true},
  {"key":"annotated_imagery","label":"Annotated Imagery","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
]'::jsonb),

-- 8. SAR THERMAL SEARCH
('sar_thermal', 'Thermal Search Report', 'Search area documentation with detection log, thermal captures, and area coverage.', 'sar', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Search Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":true},
  {"key":"findings","label":"Search Findings","required":true},
  {"key":"anomaly_log","label":"Detection Log","required":true},
  {"key":"detection_heatmap","label":"Search Coverage Map","required":false},
  {"key":"transect_map","label":"Search Pattern Map","required":true},
  {"key":"annotated_imagery","label":"Thermal Captures","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
]'::jsonb),

-- 9. PRIVATE SECTOR ANIMAL COUNTING
('private_animal_counting', 'Animal Count Report', 'Livestock or wildlife count with species table, population estimates, and detection maps.', 'animal_counting', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Count Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":true},
  {"key":"findings","label":"Count Findings","required":true},
  {"key":"species_table","label":"Species / Category Breakdown","required":true},
  {"key":"population_estimate","label":"Population Estimate","required":true},
  {"key":"confidence_interval","label":"Statistical Confidence","required":false},
  {"key":"detection_heatmap","label":"Detection Heatmap","required":false},
  {"key":"transect_map","label":"Flight Path Map","required":false},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}
]'::jsonb),

-- 10. CLASSIFIED AREA DRONE OPS
('classified_area', 'Classified Area Operations Report', 'Minimal report for sensitive facilities. Findings and deliverables only — no imagery persisted.', 'classified', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Operations Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"findings","label":"Findings","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true}
]'::jsonb);
