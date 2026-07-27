-- =====================================================================
-- Source: staged file crm-sortie-deliverables-migration-2026-07-25.sql
-- "Aerial Survey Deliverables — Capability Map" (2026-07-24 artifact)
-- Plan: agent-office/reports/2026-07-25-deliverables-crm-sortie-integration.md
-- Applied 2026-07-27 via MCP (inner begin/commit removed; runner wraps txn).
-- =====================================================================

-- 0. Helper — insert a section BEFORE a given key, preserving order.
create or replace function _add_section(manifest jsonb, sec jsonb, before_key text)
returns jsonb language plpgsql immutable as $fn$
declare
  out_arr  jsonb := '[]'::jsonb;
  elem     jsonb;
  inserted boolean := false;
begin
  if manifest @> jsonb_build_array(jsonb_build_object('key', sec->>'key')) then
    return manifest;
  end if;
  for elem in select value from jsonb_array_elements(manifest) loop
    if not inserted and elem->>'key' = before_key then
      out_arr := out_arr || sec;
      inserted := true;
    end if;
    out_arr := out_arr || elem;
  end loop;
  if not inserted then
    out_arr := out_arr || sec;
  end if;
  return out_arr;
end $fn$;

create or replace function _sec(k text, l text, r boolean)
returns jsonb language sql immutable as $fn$
  select jsonb_build_object('key', k, 'label', l, 'required', r);
$fn$;

-- 1. EIGHT NEW REPORT TEMPLATES
insert into report_templates (code, name, description, service_type, sections_manifest, is_active)
select v.code, v.name, v.description, v.service_type, v.sections_manifest, true
from (values

('land_survey_civil',
 'Land Survey & Civil Report',
 'Survey-grade topographic deliverable: classified bare-earth DTM, contours, planimetric linework and CAD/LandXML handoff, with checkpoint-verified accuracy.',
 'land_survey',
 '[{"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Survey Summary","required":true},
   {"key":"methodology","label":"Methodology","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather Conditions","required":false},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":true},
   {"key":"findings","label":"Survey Findings","required":true},
   {"key":"point_cloud_classification","label":"Point Cloud Classification & Bare-Earth DTM","required":true},
   {"key":"contours_topo","label":"Contours & Topographic Surface","required":true},
   {"key":"cross_sections","label":"Cross-Sections & Profiles","required":false},
   {"key":"planimetric_linework","label":"Planimetric Linework","required":true},
   {"key":"accuracy_checkpoint_report","label":"Accuracy & Checkpoint RMSE (ASPRS)","required":true},
   {"key":"cad_handoff","label":"CAD Handoff (DXF / DWG / LandXML)","required":true},
   {"key":"annotated_imagery","label":"Orthomosaic & Imagery","required":true},
   {"key":"coverage_qa","label":"Coverage & Point-Density QA","required":false},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}]'::jsonb),

('mining_aggregates',
 'Mining & Aggregates Volumetric Report',
 'Stockpile inventory and tonnage, pit and bench progress, and period-over-period volume change against a verified surface.',
 'mining',
 '[{"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Inventory Summary","required":true},
   {"key":"methodology","label":"Methodology","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather Conditions","required":false},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":true},
   {"key":"findings","label":"Site Findings","required":true},
   {"key":"stockpile_inventory","label":"Stockpile Inventory & Tonnage","required":true},
   {"key":"volumetrics","label":"Volumetric Analysis","required":true},
   {"key":"cut_fill","label":"Cut/Fill & Earthwork","required":false},
   {"key":"change_detection","label":"Period-over-Period Volume Change","required":true},
   {"key":"cross_sections","label":"Bench & Haul-Road Profiles","required":false},
   {"key":"contours_topo","label":"Mine-Planning Contours","required":false},
   {"key":"accuracy_checkpoint_report","label":"Accuracy & Checkpoint RMSE (ASPRS)","required":true},
   {"key":"annotated_imagery","label":"Site Imagery & Orthomosaic","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}]'::jsonb),

('environmental_forestry',
 'Environmental & Forestry Report',
 'Canopy height modelling, tree count and crown delineation, erosion and revegetation change detection, and wetland/feature delineation.',
 'forestry',
 '[{"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Survey Summary","required":true},
   {"key":"methodology","label":"Methodology","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather Conditions","required":false},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":true},
   {"key":"findings","label":"Environmental Findings","required":true},
   {"key":"canopy_height_model","label":"Canopy Height Model","required":true},
   {"key":"species_table","label":"Tree Count & Crown Delineation","required":false},
   {"key":"point_cloud_classification","label":"Point Cloud Classification","required":false},
   {"key":"change_detection","label":"Erosion / Revegetation Change (DEM-of-Difference)","required":false},
   {"key":"hydrology_drainage","label":"Drainage & Wetland Delineation","required":false},
   {"key":"annotated_imagery","label":"Survey Imagery & Orthomosaic","required":true},
   {"key":"accuracy_checkpoint_report","label":"Accuracy & Checkpoint RMSE (ASPRS)","required":false},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":false}]'::jsonb),

('utilities_corridor',
 'Utilities & Telecom Corridor Report',
 'Corridor orthomosaic and route mapping, vegetation encroachment and clearance assessment, and tower/asset inspection imagery.',
 'utilities',
 '[{"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Corridor Summary","required":true},
   {"key":"methodology","label":"Methodology","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather Conditions","required":false},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":true},
   {"key":"findings","label":"Corridor Findings","required":true},
   {"key":"planimetric_linework","label":"Corridor Route & Asset Linework","required":true},
   {"key":"canopy_height_model","label":"Vegetation Encroachment & Clearance","required":true},
   {"key":"anomaly_log","label":"Encroachment Log","required":true},
   {"key":"viewshed_los","label":"Line-of-Sight / Viewshed","required":false},
   {"key":"annotated_imagery","label":"Corridor Orthomosaic & Asset Imagery","required":true},
   {"key":"accuracy_checkpoint_report","label":"Accuracy & Checkpoint RMSE (ASPRS)","required":false},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}]'::jsonb),

('public_safety_scene',
 'Public Safety Scene Reconstruction Report',
 'Scene orthomosaic as a 2D diagram base, scene point cloud and mesh, and a scaled scene diagram for CAD, with documented scale verification.',
 'public_safety',
 '[{"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Scene Summary","required":true},
   {"key":"methodology","label":"Methodology","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather at Capture","required":true},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":true},
   {"key":"findings","label":"Scene Findings","required":true},
   {"key":"planimetric_linework","label":"Scaled Scene Diagram","required":true},
   {"key":"cross_sections","label":"Measurements & Distances","required":false},
   {"key":"accuracy_checkpoint_report","label":"Scale Verification & Accuracy","required":true},
   {"key":"annotated_imagery","label":"Scene Imagery","required":true},
   {"key":"model_3d_link","label":"Interactive 3D Scene Model","required":false},
   {"key":"cad_handoff","label":"CAD Export (DXF)","required":false},
   {"key":"scope_limitations","label":"Scope & Limitations","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true}]'::jsonb),

('insurance_claim',
 'Insurance Claim Documentation Report',
 'Scaled roof orthomosaic, GPS-tagged damage inventory, and pre/post-event comparison for claim documentation.',
 'insurance',
 '[{"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Claim Summary","required":true},
   {"key":"methodology","label":"Methodology","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather at Capture","required":true},
   {"key":"property_overview","label":"Property Overview & Location","required":true},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":false},
   {"key":"roof_plan_annotated","label":"Scaled Roof Orthomosaic & Plan","required":true},
   {"key":"observation_log","label":"Damage / Defect Inventory","required":true},
   {"key":"change_detection","label":"Pre / Post-Event Comparison","required":false},
   {"key":"storm_history","label":"NOAA Storm Event Record","required":false},
   {"key":"measurements_appendix","label":"Measurement Takeoff","required":false},
   {"key":"annotated_imagery","label":"Damage Photo Detail","required":true},
   {"key":"model_3d_link","label":"Interactive 3D Model","required":false},
   {"key":"accuracy_checkpoint_report","label":"Scale & Measurement Verification","required":false},
   {"key":"scope_limitations","label":"Scope & Limitations","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":false}]'::jsonb),

('pavement_pci',
 'Pavement Condition Report (ASTM D6433)',
 'Aerial pavement distress inventory with severity and quantity by sample unit, following ASTM D6433. PCI scoring requires a licensed copy of D6433.',
 'pavement',
 '[{"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Executive Summary","required":true},
   {"key":"methodology","label":"Method Statement","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather at Capture","required":true},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":false},
   {"key":"findings","label":"Pavement Distress Inventory (ASTM D6433)","required":true},
   {"key":"observation_log","label":"Distress Records by Sample Unit","required":true},
   {"key":"pci_rating","label":"PCI Score & Rating Band (requires licensed ASTM D6433)","required":false},
   {"key":"measurements_appendix","label":"Quantity Takeoff","required":false},
   {"key":"annotated_imagery","label":"Annotated Pavement Imagery","required":true},
   {"key":"scope_limitations","label":"Limitations & Disclaimers","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Index","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true},
   {"key":"appendix_field_forms","label":"Appendix: D6433 Sample Unit Sheets","required":false}]'::jsonb),

('cemetery_survey',
 'Cemetery Survey & Documentation Report',
 'Grave and feature inventory with plat mapping to Virginia DHR grant manual requirements, suitable for a per-grave award application.',
 'cemetery',
 '[{"key":"cover_page","label":"Cover Page","required":true},
   {"key":"executive_summary","label":"Executive Summary","required":true},
   {"key":"methodology","label":"Method Statement","required":true},
   {"key":"equipment","label":"Equipment","required":true},
   {"key":"flight_data","label":"Flight Data","required":true},
   {"key":"weather_conditions","label":"Weather at Capture","required":false},
   {"key":"datum_metadata","label":"Datum, Geoid & Epoch","required":true},
   {"key":"findings","label":"Grave & Feature Inventory","required":true},
   {"key":"observation_log","label":"Grave Marker Records","required":true},
   {"key":"planimetric_linework","label":"Cemetery Plat & Feature Mapping","required":true},
   {"key":"annotated_imagery","label":"Site Orthomosaic & Imagery","required":true},
   {"key":"accuracy_checkpoint_report","label":"Accuracy & Checkpoint RMSE (ASPRS Ed.2 V2)","required":false},
   {"key":"scope_limitations","label":"Limitations & Disclaimers","required":true},
   {"key":"sensor_limitations","label":"Sensor Scope & Limitations","required":true},
   {"key":"deliverables_manifest","label":"Deliverables Index","required":true},
   {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":true},
   {"key":"appendix_raw_data","label":"Appendix: Raw Data Manifest","required":false}]'::jsonb)

) as v(code, name, description, service_type, sections_manifest)
where not exists (select 1 from report_templates rt where rt.code = v.code);

-- 2. ACCURACY LAYER across existing geospatial templates
update report_templates
set sections_manifest = _add_section(
      sections_manifest,
      _sec('datum_metadata','Datum, Geoid & Epoch', true),
      'findings'),
    updated_at = now()
where code in ('construction_progress','property_survey','vegetation_analysis',
               'structures_inspection','solar_farm_mapping','roof_property_inspection',
               'corrections_perimeter','wildlife_census','private_animal_counting','sar_thermal');

update report_templates
set sections_manifest = _add_section(
      sections_manifest,
      _sec('accuracy_checkpoint_report','Accuracy & Checkpoint RMSE (ASPRS)', true),
      'deliverables_manifest'),
    updated_at = now()
where code in ('construction_progress','property_survey');

update report_templates
set sections_manifest = _add_section(
      sections_manifest,
      _sec('accuracy_checkpoint_report','Accuracy & Checkpoint RMSE (ASPRS)', false),
      'deliverables_manifest'),
    updated_at = now()
where code in ('vegetation_analysis','structures_inspection','solar_farm_mapping',
               'corrections_perimeter','wildlife_census');

update report_templates
set sections_manifest = _add_section(
      sections_manifest,
      _sec('sensor_limitations','Sensor Scope & Limitations', true),
      'deliverables_manifest'),
    updated_at = now()
where code in ('construction_progress','property_survey','vegetation_analysis',
               'structures_inspection','solar_farm_mapping','roof_property_inspection',
               'wildlife_census','private_animal_counting','sar_thermal');

-- 3. TEMPLATE EXTENSIONS (vertical-specific parts)
update report_templates
set sections_manifest = _add_section(
      _add_section(
        _add_section(sections_manifest,
          _sec('cut_fill','Cut/Fill Earthwork Analysis', true), 'volumetrics'),
        _sec('stockpile_inventory','Stockpile Inventory & Tonnage', false), 'annotated_imagery'),
      _sec('cross_sections','Grading Cross-Sections', false), 'annotated_imagery'),
    updated_at = now()
where code = 'construction_progress';

update report_templates
set sections_manifest = _add_section(
      _add_section(sections_manifest,
        _sec('species_table','Plant / Stand Count', false), 'change_detection'),
      _sec('coverage_qa','Coverage & Point-Density QA', false), 'deliverables_manifest'),
    updated_at = now()
where code = 'vegetation_analysis';

update report_templates
set sections_manifest = _add_section(
      _add_section(sections_manifest,
        _sec('contours_topo','Contours & Topographic Surface', false), 'annotated_imagery'),
      _sec('cad_handoff','CAD Handoff (DXF / DWG / LandXML)', false), 'deliverables_manifest'),
    updated_at = now()
where code = 'property_survey';

-- 4. SORTIE SIDE — five new processing presets
-- NOTE: each must also be added to PRESET_TO_JOB_TYPE in sortie crm_sync.py (desktop rig).
insert into processing_templates
  (preset_name, path_code, display_name, description, output_format, active, vegetation_enabled)
select v.preset_name, v.path_code, v.display_name, v.description, v.output_format, true, v.veg
from (values
  ('survey_civil',        'C+S',  'Survey & Civil — classified DTM + contours + CAD',
   'Photogrammetry with ground-point classification, contour generation and DXF/LandXML export for survey and civil clients.', 'geotiff', false),
  ('mining_volumetrics',  'C+V',  'Mining — stockpile & pit volumetrics',
   'Photogrammetry with stockpile segmentation, tonnage computation and period-over-period DEM differencing.', 'geotiff', false),
  ('forestry_chm',        'C+F',  'Forestry — canopy height & crown delineation',
   'Photogrammetry with DSM-DTM canopy height modelling and tree crown delineation.', 'geotiff', true),
  ('corridor_mapping',    'C+U',  'Utilities — corridor & encroachment',
   'Corridor-strip photogrammetry with vegetation clearance assessment and asset linework.', 'geotiff', true),
  ('scene_reconstruction','C+PS', 'Public Safety — scene reconstruction',
   'High-overlap scene capture producing point cloud, mesh and a scaled 2D diagram base.', 'geotiff', false)
) as v(preset_name, path_code, display_name, description, output_format, veg)
where not exists (
  select 1 from processing_templates pt
  where pt.preset_name = v.preset_name and pt.path_code is not distinct from v.path_code
);

-- 5. Cleanup of helpers
drop function if exists _add_section(jsonb, jsonb, text);
drop function if exists _sec(text, text, boolean);
