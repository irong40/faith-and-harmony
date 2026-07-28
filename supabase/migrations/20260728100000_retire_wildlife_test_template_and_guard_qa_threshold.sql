-- ---------------------------------------------------------------------------
-- Retire the Wildlife Census TEST template, and stop a fraction being written
-- into an integer percentage column ever again.
--
-- WHAT WENT WRONG
-- 20260416130000_seed_wildlife_census_pipeline.sql is, by its own header,
-- "SEED: Wildlife Census Pipeline Test Data". It inserted
-- preset_name='wildlife_census_thermal' with active=true, so a test fixture has
-- been sitting in the production job-type dropdown since 2026-04-09.
--
-- That seed also wrote qa_threshold = 0.75 (line 27) — 75% expressed as a 0-1
-- FRACTION — into an integer percentage column. Postgres rounded it to 1.
-- A pass mark of 1 means every score >= 1 returns "pass", so the QA gate for
-- that template passed anything at all, including a bad capture set.
--
-- Blast radius at the time of writing: one job, DJ-2026-0003, cancelled, with
-- no qa_score recorded. Nothing was ever mis-scored. But Wildlife Census is an
-- active programme, so the first real thermal transect would have run its QA
-- gate wide open.
--
-- WHY BOTH CHANGES
-- Deactivating alone would leave a nonsense threshold on a row that becomes
-- selectable again the moment someone flips active back on — which is exactly
-- what happens when Wildlife Census goes live. Correcting the value alone would
-- leave test data in the production catalogue. Do both.
-- ---------------------------------------------------------------------------

-- 1. Correct the unit mistake, recovering the seed's evident intent (0.75 -> 75).
--    Guarded on the broken value so a later hand-correction is not overwritten.
update public.processing_templates
   set qa_threshold = 75
 where preset_name = 'wildlife_census_thermal'
   and qa_threshold = 1;

-- 2. Take the test fixture out of the job-type dropdown.
--    The three admin dropdowns filter .eq("active", true), so this removes it
--    from SELECTION. The job-detail, missions-list and delivery-review embeds do
--    NOT filter on active, so DJ-2026-0003 keeps rendering its template name and
--    sortie's CRM mission dropdown is unaffected (it reads the same unfiltered
--    embed). Settings -> Processing Templates still lists it for editing.
--    Flip this back to true when Wildlife Census becomes a bookable service.
update public.processing_templates
   set active = false
 where preset_name = 'wildlife_census_thermal';

-- 3. Make the original mistake impossible.
--
--    NOTE ON THE BOUND: a naive `between 1 and 100` would NOT have caught this —
--    0.75 rounds to 1, which is inside that range. The floor has to be high
--    enough to reject anything a 0-1 fraction can round to (0 or 1) and any
--    other decimal-vs-percent slip. Live values span 60..85, so 30 rejects the
--    error class with a wide margin over every real threshold in use.
--
--    Settings -> Processing Templates writes this column directly from a form,
--    so the database is the only place this can be enforced.
alter table public.processing_templates
  add constraint processing_templates_qa_threshold_range
  check (qa_threshold is null or (qa_threshold >= 30 and qa_threshold <= 100))
  not valid;

alter table public.processing_templates
  validate constraint processing_templates_qa_threshold_range;

comment on constraint processing_templates_qa_threshold_range
  on public.processing_templates is
  'qa_threshold is an integer PERCENT (0-100 scale), not a 0-1 fraction. Floor is 30, '
  'not 1, because a fraction rounds into the low single digits and would otherwise pass. '
  'See migration 20260728100000.';
