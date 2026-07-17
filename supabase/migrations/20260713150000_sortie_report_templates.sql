-- Report templates for sortie-processed mission types.
-- Ports sortie's vegetation / property survey / structures reports into the
-- CRM report builder so both interfaces produce the same report. Reuses
-- existing report_section_key values with per-template labels — no enum,
-- frontend, or doc-generator changes required. Sortie prefills these via
-- crm_sync.push_report(); sections stay editable in the app before Generate.

insert into public.report_templates (code, name, description, service_type, sections_manifest) values

-- VEGETATION ANALYSIS (Path E) — VARI index map rides the detection_heatmap
-- section; canopy health / decline / invasive findings ride findings.
('vegetation_analysis', 'Vegetation Analysis Report', 'VARI vegetation index survey with canopy health findings, species notes, and flagged decline areas. Auto-filled by the sortie pipeline.', 'vegetation', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Executive Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":false},
  {"key":"detection_heatmap","label":"VARI Vegetation Index Map","required":true},
  {"key":"findings","label":"Vegetation Health Findings","required":true},
  {"key":"change_detection","label":"Change vs Prior Survey","required":false},
  {"key":"annotated_imagery","label":"Survey Photography & Orthomosaic","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":false}
]'::jsonb),

-- PROPERTY SURVEY (Path C mapping missions)
('property_survey', 'Property Survey Report', 'Orthomosaic-based property survey with boundary/encroachment findings, terrain analysis, and elevation data. Auto-filled by the sortie pipeline.', 'property_survey', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Executive Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":false},
  {"key":"findings","label":"Boundary & Encroachment Findings","required":true},
  {"key":"volumetrics","label":"Terrain & Volume Analysis","required":false},
  {"key":"change_detection","label":"Comparison with Prior Survey","required":false},
  {"key":"annotated_imagery","label":"Property Orthomosaic & Imagery","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":false}
]'::jsonb),

-- STRUCTURES INSPECTION (3D mesh missions)
('structures_inspection', 'Structural Inspection Report', 'Structure condition assessment with surface/deformation/corrosion findings and defect log. Auto-filled by the sortie pipeline.', 'structures', '[
  {"key":"cover_page","label":"Cover Page","required":true},
  {"key":"executive_summary","label":"Inspection Summary","required":true},
  {"key":"methodology","label":"Methodology","required":true},
  {"key":"equipment","label":"Equipment","required":true},
  {"key":"flight_data","label":"Flight Data","required":true},
  {"key":"weather_conditions","label":"Weather Conditions","required":false},
  {"key":"findings","label":"Structural Findings","required":true},
  {"key":"anomaly_log","label":"Defect Log","required":false},
  {"key":"annotated_imagery","label":"Inspection Imagery","required":true},
  {"key":"deliverables_manifest","label":"Deliverables Manifest","required":true},
  {"key":"appendix_flight_logs","label":"Appendix: Flight Logs","required":false}
]'::jsonb)

on conflict (code) do nothing;
