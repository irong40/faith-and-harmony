# SOP: Land Survey & Mapping Shoot

**Mission Type:** Aerial Mapping / Photogrammetry / Orthomosaic
**Typical Client:** Land developers, surveyors, farmers, environmental consultants, civil engineers
**Frequency:** One-time or periodic (seasonal, pre/post grading)
**Estimated Flight Time:** 20-60 minutes (depends on acreage)
**Deliverable Turnaround:** 48-72 hours (processing time)

---

## Pre-Shoot Checklist

- [ ] Confirm site boundaries and total acreage
- [ ] Get client requirements: orthomosaic, 3D model, elevation map, volumetrics, or combination
- [ ] Determine GSD (Ground Sample Distance) needed — drives altitude and overlap
- [ ] Plan flight grid in mapping software (DJI Pilot, Litchi, DroneDeploy, or Pix4Dcapture)
- [ ] Check weather — wind under 15 mph, consistent lighting (overcast is actually ideal for mapping)
- [ ] Charge batteries (3-5 depending on acreage — mapping drains batteries fast)
- [ ] If GCPs (Ground Control Points) needed: bring targets, GPS unit, stakes
- [ ] Confirm site access — gates, roads, permission from adjacent landowners if needed
- [ ] Check airspace (rural sites may still be near restricted zones)

## Equipment

- **Aircraft:** Matrice 4E preferred (RTK capable), DJI Mini 4 Pro for small sites
- **Batteries:** 3-5 (budget 15-20 min of mapping per battery)
- **Memory:** Large capacity — mapping generates thousands of photos (128 GB+ recommended)
- **Camera settings:** Manual exposure, fixed white balance, shutter priority (1/800+)
- **GCP targets:** 5-10 high-contrast targets (checkerboard or bright cross pattern)
- **GPS unit:** If survey-grade accuracy required
- **Processing software:** WebODM (local), Pix4D, DroneDeploy, or Agisoft Metashape

## GCP Placement (When Required)

Ground Control Points dramatically improve accuracy. Place them when:
- Client needs survey-grade accuracy (< 2 cm)
- Site is large (> 5 acres)
- Terrain has significant elevation changes

### GCP Rules
- Minimum 5 GCPs, ideally 7-10
- Place at perimeter AND interior (not just edges)
- Visible from flight altitude — use 2 ft x 2 ft targets
- Record precise GPS coordinates for each
- Photograph each GCP location from ground level for reference
- Avoid placing on slopes, tall grass, or surfaces that move

## Flight Planning

### Overlap Requirements

| Accuracy Level | Front Overlap | Side Overlap | Use Case |
|---------------|--------------|-------------|----------|
| Standard | 75% | 65% | General orthomosaic, land overview |
| High | 80% | 70% | Volumetrics, elevation models, 3D |
| Survey-grade | 85% | 75% | Engineering, legal survey support |

### Altitude Guidelines

| GSD Target | Flight Altitude | Best For |
|-----------|----------------|----------|
| 1 cm/pixel | 100-120 ft AGL | Detail mapping, small sites |
| 2 cm/pixel | 200-250 ft AGL | General mapping, medium sites |
| 3-5 cm/pixel | 300-400 ft AGL | Large area overview, acreage |

### Flight Pattern
- **Grid (lawnmower):** Standard for flat terrain
- **Double grid (crosshatch):** Required for 3D models and sites with structures
- **Terrain follow:** Use when elevation varies > 30 ft across site (maintains consistent GSD)

## Shot List

### Mapping Flight — Automated

The mapping software handles individual photo capture. Your job:
1. Plan the grid correctly (overlap, altitude, boundary buffer)
2. Monitor the automated flight
3. Watch battery levels — land and swap with overlap on resume

### Supplemental Manual Shots

| # | Shot | Notes |
|---|------|-------|
| 1 | Site overview | 300-400 ft, oblique — context shot |
| 2 | Boundary markers | If visible — fences, stakes, roads |
| 3 | Features of interest | Structures, water features, roads, utilities |
| 4 | Problem areas | Erosion, drainage, grade changes |
| 5 | GCP documentation | Each GCP from ground + aerial for verification |

## Flight Execution

1. Place and document GCPs (if required) — this takes 20-45 min before flying
2. Launch and run automated mapping mission
3. Monitor telemetry — watch for GPS drift, battery warnings, wind changes
4. On battery swap: note the last captured photo, ensure overlap on resume
5. After grid complete: fly supplemental manual shots
6. Do a final check pass — make sure no gaps in coverage (mapping app usually shows coverage map)
7. Land, verify photo count matches expected

### Coverage Estimation

| Acreage | Photos (2 cm GSD, 80/70 overlap) | Batteries | Flight Time |
|---------|----------------------------------|-----------|-------------|
| 1-2 acres | 200-400 | 1-2 | 10-15 min |
| 5-10 acres | 500-1,000 | 2-3 | 20-30 min |
| 20-50 acres | 1,500-3,000 | 3-5 | 35-60 min |
| 100+ acres | 5,000+ | 5+ (multi-session) | 60+ min |

## Processing Pipeline

### WebODM (Local — on your RTX 5060 Ti)

1. Import all photos into WebODM
2. Set processing parameters:
   - `--dsm` for elevation model
   - `--dtm` for bare-earth terrain model
   - `--orthophoto-resolution 2` (cm/pixel)
   - Enable `--pc-quality high` for point cloud
3. Add GCP file if used
4. Process (15 min - 2 hours depending on photo count)
5. Export deliverables

### Deliverables

| Deliverable | Format | Description |
|-------------|--------|-------------|
| Orthomosaic | GeoTIFF + JPG | Stitched, georeferenced aerial map |
| Elevation model (DSM) | GeoTIFF | Digital Surface Model with structures/vegetation |
| Terrain model (DTM) | GeoTIFF | Bare-earth elevation (if processed) |
| 3D model | OBJ / glTF | Textured 3D mesh (if double-grid flown) |
| Point cloud | LAS / LAZ | Dense point cloud for analysis |
| Contour map | DXF / SHP | Elevation contours at specified interval |
| Volume report | PDF | Cut/fill calculations (stockpiles, excavation) |
| Site overview photos | JPG | Manual supplemental shots |
| KML/KMZ | KML | Google Earth overlay of orthomosaic |

## Post-Shoot

- [ ] Back up ALL photos immediately (thousands of files — use fast SD reader)
- [ ] Log flight in Trestle (total flight time, batteries, acreage covered)
- [ ] Import to processing software within 24 hours
- [ ] Process orthomosaic + requested outputs
- [ ] QC check: look for stitching errors, blurry areas, gaps
- [ ] If issues found: note location, schedule re-fly of affected area only
- [ ] Export deliverables in client-requested formats
- [ ] Deliver via cloud link (files are large — often 1-10 GB)
- [ ] Archive: `YYYY-MM-DD_[ClientName]_Mapping_[Acreage]ac`

## Pricing Reference

| Package | Includes | Suggested Rate |
|---------|----------|---------------|
| Small site (< 5 ac) | Orthomosaic + overview photos | $250-400 |
| Medium site (5-20 ac) | Orthomosaic + DSM + contours | $400-700 |
| Large site (20-100 ac) | Full deliverable suite | $700-1,500 |
| Survey-grade (w/ GCPs) | Above + GCP placement + high accuracy | +$200-400 |
| Volumetrics add-on | Cut/fill calculations | +$150-250 |
| 3D model add-on | Textured 3D mesh | +$200-350 |
| Recurring (monthly) | Per-visit discount for ongoing monitoring | 20% off per-visit |

## Accuracy Expectations (set with client)

| Method | Horizontal Accuracy | Vertical Accuracy |
|--------|-------------------|-------------------|
| No GCPs, standard GPS | 3-10 ft | 5-15 ft |
| With GCPs (handheld GPS) | 1-3 ft | 2-5 ft |
| With GCPs (survey GPS) | 1-2 cm | 2-5 cm |
| RTK drone (no GCPs) | 2-5 cm | 3-8 cm |
| RTK drone + GCPs | 1-2 cm | 1-3 cm |

**Always clarify accuracy needs upfront.** Don't promise survey-grade without proper equipment.

## Safety Notes

- Large sites may require flying near property boundaries — get permission from adjacent owners
- Rural sites: watch for unmarked power lines, fences, and livestock
- Long flights = sun exposure — bring water and sunscreen
- If flying near roads, maintain safe distance and line of sight
- Battery management is critical — never push a battery to 0% on mapping runs
