-- =====================================================================
-- SHOT LIST TEMPLATE SEED — one list per report_templates.service_type
-- Sources: report section manifests, ROOF_INSPECTION package manifest,
-- capture-shot-list-church-cemetery.md, client-shot-specs-vacant-land.md.
-- Idempotent: inserts only where service_type absent.
-- =====================================================================
insert into public.shot_list_templates (service_type, name, items)
select v.service_type, v.name, v.items::jsonb
from (values

('generic', 'Generic Base Capture', '[
 {"group":"A. Base Capture","shots":[
   {"name":"Nadir mapping grid per mission plan (ortho + DSM source)","type":"photo"},
   {"name":"Site context / establishing wide (report cover, before-state)","type":"photo"},
   {"name":"Oblique orbit at 45 deg gimbal, full perimeter","type":"photo"}]},
 {"group":"B. Perimeter","shots":[
   {"name":"North side oblique","type":"photo"},
   {"name":"East side oblique","type":"photo"},
   {"name":"South side oblique","type":"photo"},
   {"name":"West side oblique","type":"photo"}]},
 {"group":"C. Evidence","shots":[
   {"name":"Close-up of every feature that will appear as a finding (context + close pair)","type":"photo"},
   {"name":"Address or entrance verification shot","type":"photo","required":false}]}]'),

('re_aerial', 'Real Estate Aerial Photography', '[
 {"group":"A. Hero","shots":[
   {"name":"Full-property hero shots, 250-400 ft, 5-10 frames (MLS main photo candidates)","type":"photo"},
   {"name":"Front elevation hero oblique","type":"photo"}]},
 {"group":"B. Elevations & Context","shots":[
   {"name":"North elevation oblique","type":"photo"},
   {"name":"East elevation oblique","type":"photo"},
   {"name":"South elevation oblique","type":"photo"},
   {"name":"West elevation oblique","type":"photo"},
   {"name":"Street / neighborhood context wide","type":"photo"},
   {"name":"Amenity close-ups (pool, outbuildings, view)","type":"photo","required":false}]},
 {"group":"C. Video","shots":[
   {"name":"Smooth flyover video 60-90s (10-15 second rule per movement)","type":"video","required":false},
   {"name":"Golden hour / twilight set","type":"photo","required":false}]}]'),

('land_listing', 'Land Listing Aerial (5-Stage)', '[
 {"group":"Stage 1. Access / Approach","shots":[
   {"name":"Road-to-property from ~400 ft (road + entire parcel in frame)","type":"photo"},
   {"name":"100-200 ft looking down road toward property","type":"photo"},
   {"name":"Gate / driveway / mailbox ground-level","type":"photo"},
   {"name":"Road transitions and landmarks within ~1 mile","type":"photo","required":false}]},
 {"group":"Stage 2. On-Property Ground","shots":[
   {"name":"Landscape set, 10+ frames across parcel","type":"photo"},
   {"name":"Feature close-ups: creek, pond, clearing, structures, utilities","type":"photo"},
   {"name":"Terrain shots with scale reference (vehicle in frame if nothing else)","type":"photo"}]},
 {"group":"Stage 3. Aerial Criss-Cross","shots":[
   {"name":"Lawnmower grid at 70 ft","type":"photo"},
   {"name":"Lawnmower grid at 300 ft","type":"photo"},
   {"name":"Hero whole-parcel frames, 5-10 (parcel + roads + neighbors visible)","type":"photo"}]},
 {"group":"Stage 4. Boundary Run","shots":[
   {"name":"Circular run outside boundary at 100 ft, rotated to face property","type":"photo"},
   {"name":"Circular run outside boundary at 300 ft","type":"photo"},
   {"name":"Each of 4 sides: entire side of parcel fits in frame (for parcel-line overlay)","type":"photo"}]},
 {"group":"Stage 5. Exit / Area","shots":[
   {"name":"Surrounding development: gas stations, new homes, road improvements","type":"photo","required":false},
   {"name":"Video tour 60-90s: high flyover, feature hovers, access clip","type":"video","required":false}]}]'),

('roof_inspection', 'Roof & Property Inspection', '[
 {"group":"A. Geometry","shots":[
   {"name":"Nadir mapping grid (80% front / 70% side overlap, 100-120 ft AGL)","type":"photo"},
   {"name":"Orbit 360 at 45 deg gimbal (12+ stills for 3D mesh)","type":"photo"}]},
 {"group":"B. Elevations & Context","shots":[
   {"name":"North / East / South / West elevation obliques (one each)","type":"photo"},
   {"name":"Property context wide + street context","type":"photo"}]},
 {"group":"C. Facet Documentation","shots":[
   {"name":"Per-facet 45 deg oblique (every facet)","type":"photo"},
   {"name":"Per-facet near-nadir close pass","type":"photo"},
   {"name":"Ridge / hip lines and eaves / gutter line details","type":"photo"},
   {"name":"Every penetration individually: chimney, vents, boots, skylights, HVAC","type":"photo"}]},
 {"group":"D. Observations (pairing rule: every observation gets both)","shots":[
   {"name":"Observation context shot (facet-wide, landmark visible)","type":"photo"},
   {"name":"Observation close-up (fill frame, 3x zoom before closing distance)","type":"photo"},
   {"name":"Soft-metal check: gutter / vent / flashing close-ups","type":"photo"},
   {"name":"Adjacent undamaged reference (same material)","type":"photo"}]},
 {"group":"E. Ground Level","shots":[
   {"name":"Address verification (house number visible)","type":"photo"},
   {"name":"Front elevation ground + gutter / downspout granule check","type":"photo"}]}]'),

('roof_condition', 'Roof Condition Documentation (Contractor)', '[
 {"group":"A. Mapping","shots":[
   {"name":"Nadir mapping grid over full roof","type":"photo"},
   {"name":"Oblique perimeter orbit, ~45 deg gimbal, two altitudes, 4 sides + 4 corners","type":"photo"}]},
 {"group":"B. Zones","shots":[
   {"name":"Field of roof: close pass over each slope / plane","type":"photo"},
   {"name":"Every penetration individually: vents, stacks, HVAC curbs, skylights","type":"photo"},
   {"name":"Flashing and transitions: low oblique down each valley, chimney and wall junctions","type":"photo"},
   {"name":"Slopes and drainage: oblique along each gutter line, downspout terminations, ponding stains","type":"photo"}]},
 {"group":"C. Findings","shots":[
   {"name":"Context + close-up pair for every condition finding","type":"photo"},
   {"name":"Thermal pass if flown","type":"photo","required":false}]}]'),

('property_survey', 'Property Survey', '[
 {"group":"A. Control","shots":[
   {"name":"Photo of every GCP / checkpoint target as placed","type":"photo"},
   {"name":"Base station setup record","type":"photo","required":false}]},
 {"group":"B. Mapping","shots":[
   {"name":"Nadir mapping grid, 80% front / 70% side overlap","type":"photo"},
   {"name":"Cross-grid (perpendicular) pass for surface quality","type":"photo","required":false}]},
 {"group":"C. Boundary & Features","shots":[
   {"name":"Perimeter obliques, 4 cardinal directions","type":"photo"},
   {"name":"Corner monuments / pins / fence-line close-ups","type":"photo"},
   {"name":"Site establishing shot","type":"photo"}]}]'),

('construction', 'Construction Progress', '[
 {"group":"A. Progress Mapping","shots":[
   {"name":"Nadir mapping grid over full site (ortho + volumetrics source)","type":"photo"},
   {"name":"Oblique orbit of active work areas","type":"photo"}]},
 {"group":"B. Fixed Comparison Stations","shots":[
   {"name":"Repeatable progress stations: same position, altitude, angle every visit","type":"photo"}]},
 {"group":"C. Details","shots":[
   {"name":"Stockpiles (clean nadir for volume calc)","type":"photo"},
   {"name":"Equipment and laydown areas","type":"photo","required":false},
   {"name":"Site access, entrances, safety routes","type":"photo","required":false},
   {"name":"Site context / establishing shot","type":"photo"}]}]'),

('solar', 'Solar Farm Inspection', '[
 {"group":"A. Thermal","shots":[
   {"name":"Nadir thermal grid over all arrays (per IEC flight params)","type":"photo"},
   {"name":"Thermal close pass on every detected anomaly","type":"photo"}]},
 {"group":"B. RGB","shots":[
   {"name":"Nadir RGB grid matching thermal coverage","type":"photo"},
   {"name":"String / table close-ups of flagged modules","type":"photo"},
   {"name":"Inverters, combiner boxes, wiring runs","type":"photo","required":false}]},
 {"group":"C. Context","shots":[
   {"name":"Site overview establishing shot","type":"photo"}]}]'),

('structures', 'Structural Inspection', '[
 {"group":"A. Orbits","shots":[
   {"name":"360 orbit at 45 deg gimbal, two altitudes (mesh + splat source)","type":"photo"}]},
 {"group":"B. Elevations","shots":[
   {"name":"Each face: straight-on elevation + oblique","type":"photo"}]},
 {"group":"C. Details","shots":[
   {"name":"Every defect: context shot + fill-frame close-up pair","type":"photo"},
   {"name":"Connections, joints, bearings, anchor points","type":"photo"},
   {"name":"Undersides / soffits where safely reachable","type":"photo","required":false}]},
 {"group":"D. Context","shots":[
   {"name":"Establishing shot with full structure in frame","type":"photo"}]}]'),

('vegetation', 'Vegetation Analysis', '[
 {"group":"A. Mapping","shots":[
   {"name":"Nadir RGB grid over full area of interest","type":"photo"},
   {"name":"Multispectral / NDVI grid if sensor flown","type":"photo","required":false}]},
 {"group":"B. Ground Truth","shots":[
   {"name":"Sample plot close-ups (per detection class)","type":"photo"},
   {"name":"Obliques of stressed / encroachment areas","type":"photo"}]},
 {"group":"C. Context","shots":[
   {"name":"Site overview establishing shot","type":"photo"}]}]'),

('wildlife_census', 'Thermal Wildlife Census', '[
 {"group":"A. Thermal Survey","shots":[
   {"name":"Systematic thermal grid transects at survey altitude","type":"photo"},
   {"name":"Repeat pass over detection clusters","type":"photo"}]},
 {"group":"B. Confirmation","shots":[
   {"name":"RGB zoom confirmation of each thermal detection (species / count evidence)","type":"photo"}]},
 {"group":"C. Context","shots":[
   {"name":"Habitat overview shots","type":"photo","required":false}]}]'),

('animal_counting', 'Animal Count', '[
 {"group":"A. Count Grid","shots":[
   {"name":"Full-pasture nadir grid (single pass, minimal disturbance altitude)","type":"photo"},
   {"name":"Thermal pass if flown (shade / tree-line animals)","type":"photo","required":false}]},
 {"group":"B. Verification","shots":[
   {"name":"Zoom frames of each group for count verification","type":"photo"},
   {"name":"Water / feed area close-ups","type":"photo","required":false}]},
 {"group":"C. Context","shots":[
   {"name":"Property overview establishing shot","type":"photo"}]}]'),

('sar', 'Thermal Search (SAR)', '[
 {"group":"A. Search","shots":[
   {"name":"Assigned sector thermal grid, systematic coverage","type":"photo"},
   {"name":"Hover + RGB zoom on every point of interest","type":"photo"},
   {"name":"Mark coordinates for every POI (screenshot or app mark)","type":"photo"}]},
 {"group":"B. Handoff","shots":[
   {"name":"Sector coverage track log / screen record","type":"video"}]}]'),

('corrections', 'Corrections Perimeter Inspection', '[
 {"group":"A. Perimeter","shots":[
   {"name":"Full fence-line oblique run, inside and outside faces","type":"photo"},
   {"name":"Every tower, gate, and camera post close-up","type":"photo"}]},
 {"group":"B. Overview","shots":[
   {"name":"Facility nadir grid (as authorized)","type":"photo"}]},
 {"group":"C. Findings","shots":[
   {"name":"Close-ups: breaches, erosion, vegetation encroachment, blind spots","type":"photo"}]}]'),

('classified', 'Classified Area Operations', '[
 {"group":"A. Scoped Capture","shots":[
   {"name":"Shots strictly per operations order / authorization scope","type":"photo"},
   {"name":"Coverage verification pass of assigned area","type":"photo"},
   {"name":"On-site review for incidental over-collection before leaving","type":"photo"}]}]')

) v(service_type, name, items)
where not exists (
  select 1 from public.shot_list_templates t where t.service_type = v.service_type
);

-- Backfill: generate shot lists for open missions that predate the trigger
do $$
declare r record;
begin
  for r in select id from public.drone_jobs
    where status in ('intake','scheduled','captured','uploaded','qa','revision','review_pending')
  loop
    perform public.generate_job_shot_list(r.id);
  end loop;
end $$;
