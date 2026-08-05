-- SAI owns no thermal payload. Confirmed against the live fleet table: the only
-- active aircraft are DJI Matrice 4E and DJI Mini 4 Pro. These service lines
-- were bookable and marketed anyway, which is the standing integrity item -- a
-- client could select a product that cannot be flown. Zero jobs have ever used
-- either package, so nothing in flight is disturbed.
--
-- The catalogue has three layers and all three had to be closed, because
-- processing_templates is the ONLY source for the CRM job-type dropdowns (no
-- active row = invisible) while drone_packages drives pricing and the website.
--
--   drone_packages       INSURANCE_DOC       requires_thermal, was active
--   drone_packages       SOLAR_INSPECTION    requires_thermal, was active
--   processing_templates Insurance Documentation Processing -> INSURANCE_DOC
--   processing_templates D+T Solar/Thermal Inspection       -> SOLAR_INSPECTION
--   report_templates     sar_thermal         Thermal Search Report
--   report_templates     solar_farm_mapping  Solar Farm Inspection Report
--
-- Already inactive, left alone: processing_templates WC
-- "Wildlife Census - Thermal Transect".
--
-- Deliberately NOT deactivated:
--   * report_templates wildlife_census -- the wildlife census is a live project
--     awaiting hardware, and its processing template is already inactive so it
--     is unreachable from the CRM regardless.
--   * report_templates insurance_claim -- an insurance damage report may well be
--     deliverable on RGB alone; see the note below.
--
-- ⚠️ INSURANCE_DOC's own description is "Comprehensive damage documentation with
-- RAW capture, GPS metadata, and evidence chain" -- it never mentions thermal.
-- Its requires_thermal flag may simply be wrong, in which case the honest fix is
-- to clear the flag and re-activate rather than leave a deliverable product
-- switched off. That is a product decision, not a data one, so it is left
-- deactivated pending Adam's call.
--
-- ⚠️ Both packages are priced 0, so neither was producing revenue.
--
-- ⚠️ This does NOT reach the marketing site, which caches drone_packages rather
-- than reading it live. sentinel-landing still advertises a DJI Matrice 4T the
-- company does not own, thermal payloads on the M4E, and a $1,200 Inspection
-- Data package whose description includes thermal imaging. Tracked separately.
--
-- Reversible: set active/is_active back to true. Nothing is deleted.

update public.drone_packages
set active = false, updated_at = now()
where requires_thermal is true and active is true;

update public.processing_templates
set active = false, updated_at = now()
where active is true
  and package_id in (select id from public.drone_packages where requires_thermal is true);

update public.report_templates
set is_active = false, updated_at = now()
where code in ('sar_thermal', 'solar_farm_mapping') and is_active is true;
