-- Construction Progress Monitoring schema
-- Adds construction_sites, site_visits, compliance_documents,
-- and drone_assets.cardinal_direction_tag for the progress deliverable pipeline.
--
-- Existing tables referenced: drone_jobs (spec called this "jobs"),
-- clients, drone_assets. FK types are uuid.

-- ---------------------------------------------------------------------------
-- construction_sites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.construction_sites (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id   uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL,
    name        text NOT NULL,
    address     text,
    lat         double precision,
    lng         double precision,
    created_at  timestamptz NOT NULL DEFAULT now(),
    status      text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','completed','paused'))
);

CREATE INDEX IF NOT EXISTS idx_construction_sites_client_id
    ON public.construction_sites(client_id);
CREATE INDEX IF NOT EXISTS idx_construction_sites_status
    ON public.construction_sites(status);

-- ---------------------------------------------------------------------------
-- site_visits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_visits (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id                  uuid NOT NULL REFERENCES public.construction_sites(id) ON DELETE CASCADE,
    job_id                   uuid NOT NULL UNIQUE REFERENCES public.drone_jobs(id) ON DELETE CASCADE,
    visit_number             integer NOT NULL,
    visit_date               date NOT NULL,
    pilot_name               text NOT NULL,
    aircraft_serial          text NOT NULL,
    flight_duration_minutes  integer,
    flight_start_time        timestamptz,
    laanc_authorization      text,
    change_summary           jsonb,
    deliverable_url          text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    UNIQUE (site_id, visit_number)
);

CREATE INDEX IF NOT EXISTS idx_site_visits_site_id   ON public.site_visits(site_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_job_id    ON public.site_visits(job_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_visit_date ON public.site_visits(visit_date);

-- ---------------------------------------------------------------------------
-- drone_assets.cardinal_direction_tag
-- Operator-assigned cardinal label, distinct from raw EXIF compass_direction.
-- ---------------------------------------------------------------------------
ALTER TABLE public.drone_assets
    ADD COLUMN IF NOT EXISTS cardinal_direction_tag text
        CHECK (cardinal_direction_tag IN ('N','E','S','W'));

CREATE INDEX IF NOT EXISTS idx_drone_assets_cardinal_direction_tag
    ON public.drone_assets(cardinal_direction_tag)
    WHERE cardinal_direction_tag IS NOT NULL;

-- ---------------------------------------------------------------------------
-- compliance_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.compliance_documents (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type text NOT NULL
        CHECK (document_type IN ('part107_cert','aircraft_registration','insurance_coi')),
    storage_path  text NOT NULL,
    valid_from    date,
    valid_until   date,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_type_valid
    ON public.compliance_documents(document_type, valid_until);

-- ---------------------------------------------------------------------------
-- Row Level Security: authenticated users only
-- ---------------------------------------------------------------------------
ALTER TABLE public.construction_sites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS construction_sites_authenticated  ON public.construction_sites;
DROP POLICY IF EXISTS site_visits_authenticated         ON public.site_visits;
DROP POLICY IF EXISTS compliance_documents_authenticated ON public.compliance_documents;

CREATE POLICY construction_sites_authenticated
    ON public.construction_sites
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY site_visits_authenticated
    ON public.site_visits
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY compliance_documents_authenticated
    ON public.compliance_documents
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
