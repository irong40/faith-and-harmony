# Insurance Claim Damage Documentation Report — SAI Template

> **Service line**: Post-event damage documentation for insurance claims (hail, wind, hurricane, tornado, fire, flood, tree fall, vehicle impact)
> **Grade**: Insurance-Claim-Grade / Litigation-Capable
> **Based on**: HAAG Certified Inspector terminology, IICRC S500/S520, ASTM E2128, Xactimate conventions
> **Cover letterhead**: `letterhead.html` with `{{DOCUMENT_TYPE}} = "Insurance Damage Documentation"`

---

## 1. Executive Summary

*One page. Written to be readable by adjuster, underwriter, and — if needed — a jury. No jargon without definition.*

- **Claim Reference**: `{{CARRIER_CLAIM_NO}}` / `{{POLICY_NO}}` / Insured: `{{INSURED_NAME}}`
- **Loss Event**: `{{LOSS_EVENT}}` (e.g., "Hailstorm, 1.25" stones, peak wind 58 mph, NOAA Storm Events ID `{{NOAA_ID}}`)
- **Date of Loss**: `{{DOL}}` (verified against NOAA Storm Events, METAR, witness statements — see §3)
- **Date of Inspection**: `{{DOI}}` (days post-loss: `{{DAYS}}`)
- **Subject Property**: `{{ADDRESS}}`
- **Insured Interest Inspected**: `{{STRUCTURES}}` (primary residence / outbuildings / vehicles / site improvements)
- **Summary of Damage Observed**:
  - Roof: `{{ROOF_SUMMARY}}`
  - Exterior: `{{EXT_SUMMARY}}`
  - Site: `{{SITE_SUMMARY}}`
- **Coverage Opinion**: *This report does not render coverage opinions. Causation indicators observed are reported objectively; coverage determination is the adjuster's responsibility.*

## 2. Scope of Work & Assignment

- **Client / Requester**: `{{REQUESTER}}` (carrier / TPA / insured / public adjuster / attorney)
- **Assignment Received**: `{{ASSIGN_DATE}}` via `{{CHANNEL}}`
- **Specific tasks requested**:
  - [ ] Aerial photographic documentation of all damage
  - [ ] Roof condition assessment with damage classification
  - [ ] Orthomosaic + measurement product
  - [ ] Thermal moisture scan (interior ceilings / exterior envelope)
  - [ ] 3D model for quantity takeoff
  - [ ] Xactimate-ready measurement sketch
  - [ ] `{{OTHER}}`

## 3. Loss Event Verification

### 3.1 Meteorological Verification (weather perils only)

| Data Source | Finding |
|---|---|
| NOAA Storm Events Database | `{{NOAA_EVENT}}` — event ID `{{ID}}`, max measurement `{{MEAS}}` |
| Nearest NWS METAR station | `{{STATION}}`, `{{DISTANCE}}` mi — wind gust `{{GUST}}` kts, hail reported `{{Y/N}}` |
| NWS / local media reports | `{{REPORTS}}` |
| Hail swath maps (CoreLogic / HailStrike) | Hail size `{{SIZE}}`" at subject coordinates |
| Lightning strikes within `{{RADIUS}}` | `{{COUNT}}` via Vaisala NLDN (fire peril) |

### 3.2 Witness / Occupant Statements (if provided)

> `{{STATEMENT_SUMMARY}}` — date given, identity, relation to insured

### 3.3 Prior-Loss Consideration

| Source | Evidence of Prior Condition |
|---|---|
| Google Earth Historical Imagery | Prior imagery dated `{{PRIOR_DATE}}`: `{{FINDING}}` |
| County assessor photos | `{{FINDING}}` |
| Prior SAI engagement | `{{Y/N}}` — report `{{REF}}` |
| Roof permit history | `{{PERMIT_HIST}}` |

*Pre-existing conditions — if observed and distinguishable from the loss event — are documented in §6 and clearly segregated from DOL-attributable damage.*

## 4. Subject Property Description

| Field | Value |
|---|---|
| Construction | `{{CONSTRUCTION}}` (e.g., single-family wood-frame, 2-story, gable roof) |
| Year Built | `{{YEAR}}` |
| Roof Cover | `{{COVER}}` (asphalt 3-tab / architectural / metal / tile / TPO / EPDM) |
| Roof Age (estimated) | `{{ROOF_AGE}}` years — basis: `{{BASIS}}` (permit / visual wear) |
| Roof Pitch | `{{PITCH}}` (e.g., 6:12) |
| Roof Squares | `{{SQUARES}}` sq |
| # Facets | `{{FACETS}}` |
| Ridge / Hip Length | `{{RIDGE_LF}}` LF |
| Eave / Rake | `{{EAVE_LF}}` / `{{RAKE_LF}}` LF |

(Quantities derived from the orthomosaic/3D model — see Appendix B for the dimensioned sketch.)

## 5. Inspection Methodology

- **Flight plan**: nadir grid at `{{ALT}}` ft AGL, 80%/70% overlap, GSD `{{GSD}}` cm/px
- **Orbit imagery**: 4-cardinal orbits at `{{ORBIT_ALT}}` ft, 45° gimbal
- **Close-up passes**: low-altitude (25-50 ft) manual-flight close-ups of each anomaly, GSD ≤ 0.2 cm/px
- **Thermal pass** (if scoped): `{{TIME_OF_DAY}}` with `{{DELTA_T}}` °C differential; early-morning after clear night for moisture detection
- **Reference imagery**: establishing wide-angle + compass rose per ASTM E2128
- **Evidence standards**: no EXIF stripping; no destructive edits (only lens correction, white-balance, orthorectification)

## 6. Damage Findings

### 6.1 Damage Inventory — All Observed Anomalies

Each anomaly numbered, photographed (wide + close), GPS-tagged, and classified. Severity follows HAAG scale 1-5.

| # | Location | Anomaly | Cause Indicator | Severity | GPS | Photo Refs |
|---|---|---|---|---|---|---|
| 1 | `{{FACET}}` | Circular impact, `{{SIZE}}`" dia., matte spot w/ granule displacement | Hail, DOL-consistent | <span class="sev-3">3</span> | `{{LAT}},{{LON}}` | Fig 6.1a, 6.1b |
| 2 | | | | | | |
| 3 | | | | | | |

### 6.2 Damage by Cause (grouped)

**Hail Damage (DOL-attributable indicators)**
- Granule loss at impact point exposing asphalt mat
- Random distribution across windward-exposed slopes
- Bruising on aluminum-clad soft metals (vents, flashing, gutters)
- Spatter marks on oxidized metal surfaces (confirmation of recent impacts)
- Count: `{{HAIL_COUNT}}` impacts documented across `{{FACET_LIST}}`; test squares (10' × 10') conducted on `{{NUM_SQUARES}}` slopes — results Appendix C.

**Wind Damage**
- Creased shingles on `{{FACETS}}`
- Missing shingles, # `{{COUNT}}`
- Lifted ridge cap / hip cap
- Displaced flashing / exposed fasteners

**Prior-Condition / Maintenance (non-DOL)**
- `{{OBSERVATIONS}}` — clearly segregated from loss-event damage

**Secondary / Resultant Damage**
- Interior moisture indicators (from thermal): `{{FINDINGS}}`
- Fascia/soffit water staining: `{{FINDINGS}}`

### 6.3 Thermal Moisture Findings (if scoped)

| Zone | Δ T (apparent) | Probable Cause | Moisture Probe Confirmation? |
|---|---|---|---|
| | | | |

*Thermal findings indicate differential radiance; physical moisture meter confirmation is recommended where actionable.*

### 6.4 Xactimate-Ready Measurements

| Item | Quantity | Unit | Xactimate Line Item Ref |
|---|---|---|---|
| Roof squares — architectural shingles (replace) | `{{Q}}` | SQ | RFG 220 |
| Ridge/hip — replace | `{{Q}}` | LF | RFG RIDG |
| Starter course | `{{Q}}` | LF | RFG STRT |
| Drip edge | `{{Q}}` | LF | RFG DRIP |
| Vent flashing | `{{Q}}` | EA | RFG VENT |
| `{{OTHER}}` | | | |

## 7. Comparative / Before-After (if pre-loss imagery available)

| Feature | Pre-Loss (date) | Post-Loss (DOI) | Change |
|---|---|---|---|
| South-facing slope | granule intact, no impacts visible | `{{COUNT}}` hail impacts documented | Loss-event-attributable |

## 8. Recommendations

*Narrow, factual, no advocacy.*

1. Roof replacement of affected slopes is consistent with the severity of observed damage per HAAG guidelines for impact-damaged asphalt roofing.
2. A physical hands-on inspection by a licensed roofing contractor is recommended to confirm findings and evaluate substrate (decking) condition not assessable from aerial imagery.
3. Interior inspection for moisture intrusion is recommended at thermal anomaly locations identified in §6.3.
4. `{{OTHER}}`

## 9. Photographic Evidence

- Evidence imagery numbered to match §6 anomaly log
- Each image: wide-context shot → medium → close-up; all with GPS, timestamp, and compass orientation
- Appendix D contains the full evidence plate set (print-ready)

## 10. Data Products Delivered

| Product | File | Notes |
|---|---|---|
| Final PDF report (this document) | `SAI-{{ID}}-report.pdf` | PDF/A-2b |
| Orthomosaic (GeoTIFF) | `ortho.tif` | `{{GSD}}` cm/px |
| 3D model | `model.obj` + textures | For independent measurement |
| Measurement sketch (EagleView-style) | `measurement_sketch.pdf` | Facet-by-facet |
| Xactimate ESX file | `estimate.esx` | If carrier-integration contracted |
| Raw imagery archive | `raw/` | Hashed manifest |
| Thermal R-JPEGs | `thermal/` | Radiometric |
| Flight logs + KML | `logs/` | |

## 11. Accuracy Statement

*Include `_shared/accuracy_statement.md`. For claims documentation, measurement uncertainty under ± 2% on roof squares is typical when GCPs/RTK used.*

## 12. Limitations & Disclaimers

*Include `_shared/limitations_disclaimers.md` Sections A + B.5 (insurance) + C (engagement).*

Additional insurance-specific notes:
- This report does not determine policy coverage, exclusions, or dollar value.
- SAI does not hold, and does not purport to hold, a public adjuster's license in any jurisdiction.
- This report may be offered as evidence in appraisal, arbitration, mediation, or litigation; its findings are supported by the methodology, imagery, and data retained under SAI's chain-of-custody protocol.

## 13. Chain of Custody

*Include `_shared/chain_of_custody.md`. **Required** for all insurance-grade reports.*

## 14. PIC Qualifications & Attestation

*Include `_shared/compliance_attestation.md` with PIC CV attached as Appendix F if report is for litigation.*

Additional certifications relevant to insurance work:
- `{{PIC_NAME}}` — FAA Part 107 Cert `{{CERT}}`
- `{{CERTS}}` — HAAG / IICRC / NICET / other if held
- `{{EXPERT_PRIOR}}` — prior expert testimony experience if any (Rule 702)

## 15. Appendices

- **Appendix A** — Flight logs, full weather data, LAANC authorization
- **Appendix B** — Dimensioned measurement sketch
- **Appendix C** — Hail test square documentation (HAAG protocol)
- **Appendix D** — Complete photographic evidence plate set
- **Appendix E** — Thermal imagery (full set)
- **Appendix F** — PIC CV + certifications (for litigation-grade)
- **Appendix G** — Chain of custody log + hash manifest
- **Appendix H** — NOAA Storm Events report, METAR data, hail swath map

---

*This report is the property of the named client and is intended for use in the insurance claim referenced above. Questions: info@sentinelaerialinspections.com.*
