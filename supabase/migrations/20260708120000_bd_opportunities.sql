-- BD / Contract Intelligence: bd_opportunities table
-- Phase 1 of the BD Intelligence module (see plan: do-i-already-have-imperative-avalanche).
--
-- Single queryable store for every federal / state-local / grant opportunity the scouts
-- review. Fed by the ETL loader (scripts/bd-load-opportunities.mjs) from:
--   - obsidian-dev/agent-office/cron-agents/logs/sam-scout-*.json  (rich SAM.gov source)
--   - obsidian-dev/agent-office/proposals/pipeline.json            (decisions / rationale)
-- Retains the FULL source object in `raw` so Phase 2 (award / who-won) enrichment needs
-- no re-capture. All channels live in one table, tagged by `source`.

-- ============================================================================
-- Table: bd_opportunities
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bd_opportunities (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL,

  -- Identity / source
  notice_id           text        NOT NULL UNIQUE,   -- SAM noticeId, or source-unique key
  source              text        NOT NULL DEFAULT 'sam.gov'
                        CHECK (source IN ('sam.gov', 'eva', 'bonfire', 'grants.gov', 'other')),
  solicitation_number text,

  -- Descriptive
  title               text        NOT NULL,
  agency              text,
  sub_agency          text,
  description         text,

  -- Classification codes (the "statistics on the codes" the dashboard slices by)
  naics_code          text,
  psc_code            text,       -- SAM classificationCode (Product/Service Code)
  set_aside           text,       -- typeOfSetAsideDescription

  -- Value + timing
  estimated_value     numeric,
  response_deadline   timestamptz,
  posted_date         date,

  -- Geography ("where") — place of performance
  place_city          text,
  place_state         text,       -- 2-letter code where available
  place_zip           text,

  ui_link             text,

  -- Evaluation / decision (from pipeline.json / bd-evaluate)
  screen              text,       -- 'relevant' | 'filtered'
  decision            text,       -- 'SCREENED-OUT' | 'NO-BID' | 'BID' | 'TEAMING' | ...
  rationale           text,
  evaluated_by        text,
  evaluated_date      date,

  -- Outcome funnel (Phase 2 populates submitted_at / outcome from award data)
  submitted_at        timestamptz,
  outcome             text        NOT NULL DEFAULT 'pending'
                        CHECK (outcome IN ('pending', 'won', 'lost', 'no-award')),

  -- Full source record retained for later enrichment (award object, contacts, etc.)
  raw                 jsonb
);

COMMENT ON TABLE public.bd_opportunities IS
  'Every reviewed contract/grant opportunity across all scout sources, with codes, geography, decision, and outcome. Phase 1 of BD Intelligence.';
COMMENT ON COLUMN public.bd_opportunities.raw IS
  'Full source object (e.g. SAM.gov opportunity) retained so award / who-won enrichment needs no re-capture.';

-- Indexes for the dashboard slice-and-dice
CREATE INDEX IF NOT EXISTS idx_bd_opportunities_source        ON public.bd_opportunities (source);
CREATE INDEX IF NOT EXISTS idx_bd_opportunities_naics         ON public.bd_opportunities (naics_code);
CREATE INDEX IF NOT EXISTS idx_bd_opportunities_psc           ON public.bd_opportunities (psc_code);
CREATE INDEX IF NOT EXISTS idx_bd_opportunities_agency        ON public.bd_opportunities (agency);
CREATE INDEX IF NOT EXISTS idx_bd_opportunities_decision      ON public.bd_opportunities (decision);
CREATE INDEX IF NOT EXISTS idx_bd_opportunities_state         ON public.bd_opportunities (place_state);
CREATE INDEX IF NOT EXISTS idx_bd_opportunities_evaluated     ON public.bd_opportunities (evaluated_date);
CREATE INDEX IF NOT EXISTS idx_bd_opportunities_deadline      ON public.bd_opportunities (response_deadline);

-- ============================================================================
-- RLS: admin-only (mirrors governance tables)
-- ============================================================================

ALTER TABLE public.bd_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.bd_opportunities
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "admins_all_bd_opportunities" ON public.bd_opportunities
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER set_bd_opportunities_updated_at
  BEFORE UPDATE ON public.bd_opportunities
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
