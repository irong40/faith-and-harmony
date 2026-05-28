# Construction Progress Monitoring Report — SAI Template

> **Service line**: Recurring (weekly / bi-weekly / monthly) documentation of construction site progress, stockpile inventory, schedule verification, safety observations
> **Grade**: Commercial — Contractor / Owner / Lender
> **Cover letterhead**: `letterhead.html` with `{{DOCUMENT_TYPE}} = "Construction Progress Report"`

---

## 1. Executive Summary

- **Project**: `{{PROJECT}}` — `{{OWNER}}` (owner), `{{GC}}` (GC)
- **Reporting Period**: `{{PERIOD_START}}` to `{{PERIOD_END}}` (Flight # `{{N}}` of engagement)
- **Overall Progress**: `{{PCT}}` % complete (visual estimate cross-referenced against supplied schedule)
- **Schedule Status**: `{{STATUS}}` (on-track / ahead by `{{X}}` days / behind by `{{X}}` days)
- **Key Activity Since Prior Flight**:
  - `{{EVENT_1}}`
  - `{{EVENT_2}}`
  - `{{EVENT_3}}`
- **Flagged Items**: `{{FLAGS}}` safety / quality / schedule observations forwarded to owner

## 2. Project Identification

| Field | Value |
|---|---|
| Project Name | `{{NAME}}` |
| Owner | `{{OWNER}}` |
| General Contractor | `{{GC}}` |
| Project Manager (client-side) | `{{PM}}` |
| Architect / Engineer | `{{AE}}` |
| Project Address | `{{ADDRESS}}` |
| Scope | `{{SCOPE}}` (e.g., 180,000 sf Class A office, 5 stories + 2 subgrade) |
| Contract Value | `{{VALUE}}` (if provided; redact if confidential) |
| Original Completion Date | `{{ORIG_END}}` |
| Current Scheduled Completion | `{{CURRENT_END}}` |

## 3. Flight Series Overview

| Flight # | Date | Purpose | Deliverable | Notes |
|---|---|---|---|---|
| 1 | `{{D}}` | Pre-construction baseline | Baseline ortho + DSM | Site conditions captured prior to mobilization |
| 2 | | | | |
| ... | | | | |
| **`{{N}}`** | `{{CURRENT_DATE}}` | This report | Full deliverable set | |

## 4. Comparison Grid — Prior vs. Current

*Core of progress reporting. Same vantage points, same altitudes, same angles every flight.*

### 4.1 Consistent Waypoint Set

Missions are flown from a pre-defined waypoint plan (`waypoints.kml`) to ensure side-by-side comparability. Any deviations from the plan are documented in §11.

### 4.2 Side-by-Side Imagery

| Vantage | Prior Flight (`{{DATE}}`) | Current Flight (`{{DATE}}`) | Change Narrative |
|---|---|---|---|
| Plan view (nadir) | Fig 4.2.1a | Fig 4.2.1b | `{{NARRATIVE}}` |
| SW orbit @ 45° | Fig 4.2.2a | Fig 4.2.2b | `{{NARRATIVE}}` |
| SE orbit @ 45° | | | |
| NE orbit @ 45° | | | |
| NW orbit @ 45° | | | |

### 4.3 Orthomosaic Difference

- Prior orthomosaic: `ortho_{{PRIOR_DATE}}.tif`
- Current orthomosaic: `ortho_{{CURRENT}}.tif`
- Change detection overlay: `change_{{PRIOR_DATE}}_to_{{CURRENT}}.pdf`

### 4.4 DEM-of-Difference (cut / fill)

For earthwork / site-prep phases:

| Zone | Volume Change (cy) | Interpretation |
|---|---|---|
| Foundation A | +`{{V}}` | Fill placed for pad elevation |
| Utility trench B | –`{{V}}` | Trench excavation |

## 5. Progress by Trade / Division

### 5.1 CSI MasterFormat Divisions

| Div | Scope | % Complete (Prior) | % Complete (Current) | Δ | Visual Evidence |
|---|---|---|---|---|---|
| 02 | Existing Conditions | | | | |
| 03 | Concrete | | | | |
| 04 | Masonry | | | | |
| 05 | Metals | | | | |
| 06 | Wood, Plastics, Composites | | | | |
| 07 | Thermal / Moisture Protection | | | | |
| 08 | Openings | | | | |
| 09 | Finishes | | | | |
| 23 | HVAC | | | | |
| 26 | Electrical | | | | |
| 31 | Earthwork | | | | |
| 32 | Exterior Improvements | | | | |
| 33 | Utilities | | | | |

*Percentages are visual estimates, not certified pay-application values.*

### 5.2 Critical Path Items Observed

- `{{ITEM_1}}` — status and observation
- `{{ITEM_2}}`

## 6. Schedule Compliance

### 6.1 Planned vs Actual Milestones

| Milestone | Baseline Date | Current Forecast | Actual (if complete) | Δ (days) |
|---|---|---|---|---|
| Foundation complete | | | | |
| Shell complete | | | | |
| Dry-in | | | | |
| `{{MILESTONE}}` | | | | |

### 6.2 Forward-Looking Observations

*What a reader walking the site visually would expect to see next, tied to the schedule.*

- Next 14 days: expect to see `{{EXPECTED_WORK}}`
- Next 30 days: `{{EXPECTED_WORK}}`

## 7. Stockpile & Material Inventory

| Material | Location | Volume (cy) | Δ vs Prior | Methodology |
|---|---|---|---|---|
| Aggregate stockpile | NW storage | `{{V}}` | +/– `{{DV}}` | Photogrammetric prism from surveyed base |
| Topsoil stockpile | NE storage | | | |
| Excavated spoil | Central | | | |
| Delivered materials staging | S laydown | | | Item count, not volumetric |

*Volume uncertainty ± `{{UNC}}` % per §13 accuracy statement.*

## 8. Safety & Site Observations

*Informational observations visible from aerial perspective. SAI is not a Competent Person under OSHA 1926 and does not issue citations.*

| # | Observation | Location | Urgency | Photo Ref |
|---|---|---|---|---|
| 1 | Open edge without guardrail at L3 perimeter | `{{GPS}}` | Flag to Superintendent | Fig 8.1 |
| 2 | Ladder in contact with exposed wiring | | | |

## 9. Quality Observations

Visual quality items a PM might want to investigate on walk-through:

- `{{OBSERVATION}}`

## 10. Site Logistics / Laydown

- **Active crane(s)**: `{{N}}` — locations and coverage radius mapped
- **Access roads**: `{{STATUS}}`
- **Laydown utilization**: `{{PCT}}` % of available site storage occupied
- **Traffic control**: `{{STATUS}}`

## 11. Flight Log & Deviations

- Sorties flown: `{{N}}`
- Total flight time: `{{TIME}}`
- Deviations from waypoint plan: `{{DEVIATIONS}}` (with reason — wind, crane obstruction, active work below)
- Images captured: `{{N_RGB}}` RGB, `{{N_THERMAL}}` thermal
- Weather at flight: see metadata header

## 12. Data Products Delivered

| Product | File | Cadence |
|---|---|---|
| Progress report PDF | `SAI-{{ID}}-progress-{{PERIOD}}.pdf` | Every flight |
| Orthomosaic | `ortho.tif` | Every flight |
| DSM | `dsm.tif` | Every flight |
| Point cloud | `pc.laz` | Monthly |
| 3D model | `model.obj` | Monthly |
| DEM-of-difference | `dod.tif` | Every flight after baseline |
| Orbit imagery (5 vantages) | `orbits/` | Every flight |
| 360° panoramas at fixed stations | `panos/` | Every flight |
| KMZ for Google Earth review | `site.kmz` | Every flight |
| Web portal (if hosted) | `{{URL}}` | Continuously updated |

## 13. Accuracy Statement

*Include `_shared/accuracy_statement.md`.*

Critical for this service line:
- Volumetric uncertainty is the dominant error; stated per stockpile in §7
- Schedule/progress estimates are visual; they do not replace certified surveyor-stamped pay-application measurement

## 14. Limitations & Disclaimers

*Include `_shared/limitations_disclaimers.md` Sections A + B.6 (construction) + C.*

## 15. Compliance Attestation

*Include `_shared/compliance_attestation.md`.*

## 16. Appendices

- **A** — Orthomosaic at full resolution
- **B** — Orbit imagery (5 vantages)
- **C** — 360° panoramas from fixed stations
- **D** — DEM-of-difference map
- **E** — Stockpile volume computations
- **F** — Flight logs + weather + LAANC
- **G** — Comparison grid (full-page spreads for each vantage)

---

*Recurring deliveries are also available via interactive web portal. Ask about Propeller or DroneDeploy integration.*

*Questions: info@sentinelaerialinspections.com.*
