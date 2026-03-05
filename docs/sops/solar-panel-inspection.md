# SOP: Solar Panel Inspection Shoot

**Mission Type:** Solar Array Condition Assessment
**Typical Client:** Solar installers, property owners, facility managers, insurance
**Frequency:** Annual, post-install verification, or post-event
**Estimated Flight Time:** 15-30 minutes
**Deliverable Turnaround:** 48-72 hours (thermal processing time)

---

## Pre-Shoot Checklist

- [ ] Confirm site address, contact, and array details (kW capacity, panel count, install date)
- [ ] Ask client: what's the goal? (Annual check, performance issue, post-storm, warranty claim, pre-purchase)
- [ ] Get system layout if available (installer site plan showing string/inverter assignments)
- [ ] **Schedule for peak solar hours** — thermal inspection requires sun on panels (10 AM - 2 PM ideal)
- [ ] Check weather — clear sky required for thermal, cloud shadows ruin thermal data
- [ ] Charge batteries (2-3)
- [ ] Confirm thermal camera is calibrated and functioning
- [ ] Review site on Google Maps — panel layout, roof type, access, obstacles

## Equipment

- **Aircraft:** Matrice 4E with thermal payload (preferred) or DJI Mini 4 Pro (visual only)
- **Batteries:** 2-3
- **Memory:** 128 GB+ (thermal + visual = large files)
- **Thermal camera:** REQUIRED for meaningful solar inspection. Radiometric thermal (records actual temperatures, not just images)
- **Camera settings:**
  - Visual: Highest resolution, manual exposure
  - Thermal: Emissivity set to 0.85-0.95 (glass/silicon), auto range or manual span
- **Ground gear:** Clipboard with panel layout diagram, IR thermometer for ground-truth

## Why Thermal Matters

Visual inspection catches maybe 20% of solar panel issues. Thermal catches:
- **Hot spots** — cell failure, bypass diode failure, cracked cells
- **Hot strings** — string-level failure (entire row of cells overheating)
- **Cold panels** — disconnected panel not producing (cooler than neighbors)
- **Shading patterns** — partial shading causing mismatch losses
- **Connection issues** — hot junction boxes, combiner boxes
- **Delamination** — moisture ingress causing hot zones
- **Soiling patterns** — dirt/debris causing uneven heating

## Site Arrival Protocol

1. Meet client or site contact
2. Verify system is **energized and producing** (thermal anomalies only show under load)
3. If possible, check inverter display for current production level
4. Walk the site — note shading sources, panel orientation, tilt angle
5. Identify soiling, physical damage, or debris visible from ground
6. Choose launch zone with clear view of array
7. Note ambient temperature and irradiance level if meter available

## Shot List

### Visual — Mandatory

| # | Shot | Altitude | Camera Angle | Notes |
|---|------|----------|-------------|-------|
| 1 | Full array overview | 80-120 ft AGL | 30-45° | Shows entire installation |
| 2 | Array nadir | 60-80 ft AGL | 90° | Top-down for panel identification |
| 3 | Each string/section | 30-50 ft AGL | 45° | Close enough to see physical condition |
| 4 | Detail: cracked/damaged panels | 15-25 ft AGL | 45-90° | Individual panel defects |
| 5 | Detail: soiling/debris | 15-25 ft AGL | 45° | Bird droppings, leaves, dirt accumulation |
| 6 | Wiring and junction boxes | 20-40 ft AGL | 45° | Visible conduit, boxes, connections |
| 7 | Mounting hardware | 20-40 ft AGL | 45° | Rail condition, clamp status, flashing |
| 8 | Ground-mount base (if applicable) | Ground level | Various | Foundation, posts, ground clearance |

### Thermal — Mandatory

| # | Shot | Altitude | Camera Angle | Notes |
|---|------|----------|-------------|-------|
| 9 | Full array thermal overview | 60-80 ft AGL | 60-90° | Shows hot/cold anomaly distribution |
| 10 | Systematic thermal grid | 30-50 ft AGL | 90° (nadir) | Fly grid pattern covering every panel |
| 11 | Anomaly close-ups | 15-30 ft AGL | 60-90° | Each detected anomaly from thermal grid |
| 12 | Reference panels (normal) | 30-50 ft AGL | 90° | Known-good panels for temperature comparison |

### Ground-Level

| # | Shot | Notes |
|---|------|-------|
| 13 | Inverter display | Current production, error codes |
| 14 | Inverter/combiner condition | Physical condition, wiring |
| 15 | Meter reading | Production meter if accessible |
| 16 | Ground-visible damage | Cracked panels, loose wiring from below |
| 17 | Shading sources | Trees, structures, equipment casting shadows on array |

## Flight Execution — Thermal

**Timing is everything for thermal inspections:**

1. Fly **between 10 AM and 2 PM** on a clear day
2. System must be under load (producing power) — NOT in morning startup
3. Minimum 500 W/m² irradiance on the panels
4. No clouds passing — even brief shadows invalidate thermal data for that pass
5. Wind under 10 mph preferred (wind cools panels and reduces anomaly contrast)

### Thermal Flight Pattern

1. Start with visual overview shots
2. Switch to thermal camera
3. Fly systematic grid at 30-50 ft AGL, nadir (straight down)
4. Speed: 3-5 mph maximum — thermal needs dwell time
5. Overlap: 60-70% to ensure every panel captured clearly
6. When anomaly detected: pause, descend to 15-30 ft, capture close-up
7. Switch back to visual: photograph the same anomaly in visual spectrum
8. Complete grid, then capture overall thermal overview from higher altitude

## Anomaly Classification

| Category | Thermal Signature | Severity | Action |
|----------|------------------|----------|--------|
| **Hot spot (cell)** | Single cell 10-20°C above neighbors | Moderate | Monitor, report to installer |
| **Hot spot (severe)** | Cell 20°C+ above neighbors | High | Immediate repair/replace — fire risk |
| **Hot string** | Entire cell string hot | Moderate-High | Bypass diode or string failure |
| **Cold panel** | Panel same temp as ambient (not producing) | High | Disconnected or failed panel |
| **Warm panel (uniform)** | Whole panel 5-10°C above neighbors | Low-Moderate | Possible soiling, connection resistance |
| **Hot junction box** | Junction box significantly hotter | High | Connection failure — fire risk |
| **Shading pattern** | Partial hot zone matching shadow | Low | Tree trimming or design issue |
| **Delamination** | Irregular warm zone, not cell-shaped | Moderate | Moisture ingress, warranty claim |

## Deliverables

| Deliverable | Format | Description |
|-------------|--------|-------------|
| Visual photo set | JPG | All aerial + ground visual photos |
| Thermal image set | RJPG / TIFF | Radiometric thermal images with temperature data embedded |
| Inspection report | PDF | Professional report (see structure below) |
| Anomaly map | PDF | Array diagram with each anomaly located and numbered |
| Panel-level assessment | PDF/CSV | Status of each panel (pass/monitor/fail) |
| Thermal overlay | JPG | Thermal image overlaid on visual for client clarity |
| Production analysis | PDF | If monitoring data available — correlate anomalies with output loss |

## Report Structure

1. **Cover page** — Site info, system specs, inspection date, conditions
2. **Executive summary** — Overall system health rating, critical findings count
3. **Inspection conditions** — Time, ambient temp, irradiance, wind, cloud cover
4. **System overview** — Visual photos of full array, inverter, components
5. **Thermal findings** — Each anomaly with:
   - Thermal image (with temperature scale)
   - Corresponding visual image
   - Location on array diagram
   - Classification and severity
   - Recommended action
6. **Panel assessment matrix** — Every panel: pass/monitor/fail
7. **Summary and recommendations** — Prioritized action list
8. **Appendix** — All additional photos, equipment specs, methodology notes

## System Health Rating

| Rating | Criteria |
|--------|----------|
| **Excellent** | No anomalies, uniform thermal profile |
| **Good** | Minor anomalies only (< 3 low-severity), no production impact |
| **Fair** | Some moderate anomalies, estimated < 5% production loss |
| **Needs Attention** | Multiple moderate anomalies or 1+ high severity |
| **Critical** | High-severity anomalies with fire risk or major production loss |

## Post-Shoot

- [ ] Back up all files (visual + thermal + RAW)
- [ ] Log flight in Trestle with system details in notes
- [ ] Process thermal images — identify and classify all anomalies
- [ ] Build anomaly map on array diagram
- [ ] Create inspection report
- [ ] Deliver within 48-72 hours
- [ ] Archive: `YYYY-MM-DD_[ClientName]_Solar_Inspection_[kW]kW`

## Pricing Reference

| Package | Includes | Suggested Rate |
|---------|----------|---------------|
| Visual only (no thermal) | Photos + basic condition report | $200-300 |
| Thermal inspection (residential) | Visual + thermal + full report | $350-500 |
| Thermal inspection (commercial, < 100 kW) | Full report + anomaly map + panel matrix | $500-900 |
| Thermal inspection (commercial, 100+ kW) | Full report suite + production analysis | $900-1,500+ |
| Post-install verification | Visual + thermal baseline for warranty | $300-500 |
| Annual retainer (residential) | 1 thermal inspection/year | $300-400/yr |
| Annual retainer (commercial) | 2 inspections/year (spring + fall) | $800-1,200/yr |

## Safety Notes

- Solar panels are ALWAYS energized in daylight — treat as live electrical equipment
- Never touch panels, wiring, or inverters unless qualified
- Hot spots can indicate fire risk — flag immediately to client
- Reflective panel surfaces can interfere with drone sensors — watch for erratic behavior
- Ground-mount arrays may have exposed wiring at ground level — watch your step
- Large commercial arrays can create thermal updrafts affecting drone stability
