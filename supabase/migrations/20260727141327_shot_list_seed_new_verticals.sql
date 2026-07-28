-- =====================================================================
-- SHOT LIST SEED — 8 new verticals (matches deliverables_report_templates)
-- Sources: report section manifests, capture-shot-list-church-cemetery.md
-- (cemetery), spec-parking-lot-planner / report-system-spec-v1 Part 5.2
-- (pavement), client field docs. Idempotent.
-- =====================================================================
insert into public.shot_list_templates (service_type, name, items)
select v.service_type, v.name, v.items::jsonb
from (values

('land_survey', 'Land Survey & Civil', '[
 {"group":"A. Control","shots":[
   {"name":"Photo of every GCP as placed (target centered, context visible)","type":"photo"},
   {"name":"Photo of every independent checkpoint (never reused as GCP)","type":"photo"},
   {"name":"Base station setup and antenna height record","type":"photo"}]},
 {"group":"B. Mapping","shots":[
   {"name":"Nadir mapping grid, 80% front / 70% side overlap, per plan GSD","type":"photo"},
   {"name":"Cross-grid perpendicular pass (surface quality for DTM)","type":"photo"},
   {"name":"Low obliques over dense vegetation areas (aids ground classification)","type":"photo","required":false}]},
 {"group":"C. Planimetric Evidence","shots":[
   {"name":"Close-ups: monuments, pins, utility fixtures, edge-of-pavement transitions","type":"photo"},
   {"name":"Drainage features: inlets, culverts, ditch lines","type":"photo"},
   {"name":"Site establishing shot","type":"photo"}]}]'),

('mining', 'Mining & Aggregates Volumetrics', '[
 {"group":"A. Control","shots":[
   {"name":"GCP / checkpoint photos as placed (volumes are only defensible against verified surface)","type":"photo"}]},
 {"group":"B. Mapping","shots":[
   {"name":"Nadir grid over full site including all stockpiles","type":"photo"},
   {"name":"Oblique orbit of each stockpile (toe-to-crest visible, clean base line)","type":"photo"},
   {"name":"Bench faces and haul roads oblique passes","type":"photo","required":false}]},
 {"group":"C. Evidence","shots":[
   {"name":"Close-ups of material type per stockpile (for tonnage density class)","type":"photo"},
   {"name":"Pit / bench progress areas since last visit","type":"photo"},
   {"name":"Site establishing shot","type":"photo"}]}]'),

('forestry', 'Environmental & Forestry', '[
 {"group":"A. Mapping","shots":[
   {"name":"Nadir grid over full area, high overlap (85/80) for canopy reconstruction","type":"photo"},
   {"name":"Cross-grid pass over dense canopy blocks","type":"photo","required":false}]},
 {"group":"B. Ground Truth","shots":[
   {"name":"Sample plot photos: representative stems / crowns per stand type","type":"photo"},
   {"name":"Erosion, bare-soil, and revegetation area obliques","type":"photo"},
   {"name":"Wetland / drainage feature obliques along delineation lines","type":"photo","required":false}]},
 {"group":"C. Context","shots":[
   {"name":"Site establishing shot","type":"photo"}]}]'),

('utilities', 'Utilities & Telecom Corridor', '[
 {"group":"A. Corridor","shots":[
   {"name":"Corridor strip passes, full route, consistent altitude and overlap","type":"photo"},
   {"name":"Nadir coverage of every span / segment (no gaps at turn points)","type":"photo"}]},
 {"group":"B. Assets","shots":[
   {"name":"Orbit of every tower / pole / mast (all faces)","type":"photo"},
   {"name":"Close-ups: insulators, hardware, attachment points, guy anchors","type":"photo"},
   {"name":"Line-of-sight shots between endpoints if LOS assessment ordered","type":"photo","required":false}]},
 {"group":"C. Encroachment","shots":[
   {"name":"Oblique of every vegetation encroachment point (span identifiable)","type":"photo"},
   {"name":"Ground-level clearance reference shots at worst-case spans","type":"photo","required":false}]}]'),

('public_safety', 'Public Safety Scene Reconstruction', '[
 {"group":"A. Scene Capture","shots":[
   {"name":"High-overlap nadir grid (85/80) over full scene, single session","type":"photo"},
   {"name":"Orbit at 45 deg gimbal, two altitudes (mesh source)","type":"photo"},
   {"name":"Low obliques of key evidence areas from 4 directions","type":"photo"}]},
 {"group":"B. Scale & Verification","shots":[
   {"name":"Scale references in frame: evidence markers, scale bars, measured baseline","type":"photo"},
   {"name":"Photo of each measured ground distance used for scale verification","type":"photo"}]},
 {"group":"C. Documentation","shots":[
   {"name":"Establishing shots: approaches, roadway, sight lines","type":"photo"},
   {"name":"Capture-time conditions record (lighting, weather, surface state)","type":"photo"}]}]'),

('insurance', 'Insurance Claim Documentation', '[
 {"group":"A. Roof Plan","shots":[
   {"name":"Nadir mapping grid over roof (scaled ortho source)","type":"photo"},
   {"name":"Orbit 360 at 45 deg gimbal (3D model source)","type":"photo"}]},
 {"group":"B. Damage Inventory (pairing rule: every item gets both)","shots":[
   {"name":"Context shot per damage item (facet-wide, landmark visible)","type":"photo"},
   {"name":"GPS-tagged close-up per damage item (fill frame)","type":"photo"},
   {"name":"Soft-metal impact indicators: gutters, vents, flashing close-ups","type":"photo"},
   {"name":"Adjacent undamaged reference, same material","type":"photo"},
   {"name":"Storm-direction facets: extra passes on windward slopes","type":"photo","required":false}]},
 {"group":"C. Property Record","shots":[
   {"name":"All four elevations","type":"photo"},
   {"name":"Address verification (number visible)","type":"photo"},
   {"name":"Collateral damage ground shots: fence, screens, AC fins, vehicles","type":"photo","required":false}]}]'),

('pavement', 'Pavement Condition (ASTM D6433)', '[
 {"group":"A. Mapping","shots":[
   {"name":"Low-altitude nadir grid over all pavement, GSD fine enough to classify distress severity","type":"photo"},
   {"name":"Second pass in raking light if cracks are low-contrast","type":"photo","required":false}]},
 {"group":"B. Sample Units","shots":[
   {"name":"Close-up set per sample unit: each distress type present, severity legible","type":"photo"},
   {"name":"Reference object in frame for quantity scale where lines absent","type":"photo","required":false}]},
 {"group":"C. Drainage & Edges","shots":[
   {"name":"Ponding, patching, and edge-break obliques along curb lines","type":"photo"},
   {"name":"Inlets and drainage structures close-ups","type":"photo","required":false}]},
 {"group":"D. Context","shots":[
   {"name":"Full-lot establishing shot","type":"photo"}]}]'),

('cemetery', 'Cemetery Survey (DHR)', '[
 {"group":"A. Base Mapping","shots":[
   {"name":"Nadir mapping grid, ~1 cm GSD (plat + DSM source; DSM covers lean and subsidence)","type":"photo"},
   {"name":"Site context / establishing shot","type":"photo"}]},
 {"group":"B. Per-Marker Evidence","shots":[
   {"name":"Per-marker inscription photo, ground-level or low oblique, inscription face legible (this set IS the eligible-grave count evidence)","type":"photo"},
   {"name":"Condition close-up per damaged marker: displaced, sunken, fragmented, biological growth","type":"photo"}]},
 {"group":"C. Boundary","shots":[
   {"name":"Boundary and encroachment obliques along full perimeter","type":"photo"}]},
 {"group":"D. Before-Leaving-Site Gate","shots":[
   {"name":"Verify marker photo count equals marker count from quick nadir screen","type":"photo"}]}]')

) v(service_type, name, items)
where not exists (
  select 1 from public.shot_list_templates t where t.service_type = v.service_type
);
