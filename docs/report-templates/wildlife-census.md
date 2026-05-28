# Wildlife Thermal / RGB Census Report — SAI Template

> **Service line**: Wildlife population census, animal counting, herd monitoring (deer, geese, waterfowl, livestock, feral hogs, invasive species, marine mammals)
> **Grade**: Research / Government / Commercial
> **Based on**: Beaver et al. (2020, Wildlife Society Bulletin), BH Wildlife Consultancy methodology, USGS/USDA thermal census protocols
> **Cover letterhead**: `letterhead.html` with `{{DOCUMENT_TYPE}} = "Wildlife Census Report"`

---

## 1. Executive Summary

*One page, standalone, readable by non-technical stakeholder (e.g., county board, wildlife commission, HOA, insurance actuary).*

- **Survey Purpose**: `{{PURPOSE}}` (e.g., "Pre-season deer population estimate for {{JURISDICTION}} to inform 2026-27 harvest quota.")
- **Survey Date(s) & Location**: `{{DATES}}`, `{{SITE}}` (`{{ACRES}}` acres / `{{KM2}}` km²)
- **Target Species**: `{{SPECIES}}` (common name + scientific name)
- **Headline Finding**: Estimated population of `{{ESTIMATE}}` individuals (95% CI: `{{CI_LOW}}` – `{{CI_HIGH}}`), density `{{DENSITY}}` individuals/km²
- **Trend** (if repeat survey): `{{DELTA}}` vs. prior survey of `{{PRIOR_DATE}}`
- **Recommendation**: `{{RECOMMENDATION}}` (e.g., "Maintain current hunt quota", "Increase antlerless harvest by 15%", "Initiate targeted removal")

## 2. Survey Objectives & Scope

- **Primary objective**: `{{OBJECTIVE}}`
- **Secondary objectives**: `{{SECONDARY}}` (e.g., age/sex structure, habitat association, disease indicators)
- **Area of interest**: polygon `{{AOI_FILE}}.kml` — `{{ACRES}}` acres, `{{KM2}}` km²
- **Habitat composition**: `{{PCT_FOREST}}`% forest, `{{PCT_OPEN}}`% open/agricultural, `{{PCT_WATER}}`% water, `{{PCT_URBAN}}`% developed
- **Excluded zones**: `{{EXCLUSIONS}}` (airspace restrictions, private inholdings that did not consent, active hunt zones)

## 3. Methodology

### 3.1 Survey Design

| Parameter | Value | Rationale |
|---|---|---|
| Design Type | `{{DESIGN}}` | Systematic line-transect / strip-transect / block / adaptive |
| Transect Spacing | `{{SPACING}}` m | Balance between coverage completeness and flight time |
| Altitude AGL | `{{ALT_FT}}` ft / `{{ALT_M}}` m | Optimized for sensor GSD without behavioral disturbance |
| Flight Speed | `{{SPEED_MS}}` m/s | `{{SPEED_MPH}}` mph — within sensor motion-blur threshold |
| Sampling Fraction | `{{FRAC}}` % of AOI | Coverage target per `{{PROTOCOL}}` |
| Time of Day | `{{TOD}}` | Thermal: 30-90 min pre-sunrise for max body-substrate contrast |
| Diel Cycle | `{{CYCLE}}` | Dusk/dawn/night — species-appropriate |
| # Passes | `{{PASSES}}` | Independent passes for double-observer adjustment |

### 3.2 Sensor Configuration

| Parameter | Value |
|---|---|
| Thermal sensor | `{{MODEL}}` (e.g., DJI M4T thermal, 640×512, 13mm, LWIR 8-14 μm) |
| Palette | White-Hot (industry standard) |
| Emissivity | `{{EMISSIVITY}}` (0.98 default for mammalian fur) |
| Range | High-Gain mode `{{RANGE_MIN}}°C – {{RANGE_MAX}}°C` |
| RGB sensor | `{{RGB_MODEL}}` (for species confirmation / ground truth) |
| Radiometric recording | YES — R-JPEG per frame, MP4 video with temperature telemetry |

### 3.3 Detection & Counting Protocol

1. **Primary detection**: real-time thermal video review by PIC; secondary review post-flight by independent analyst
2. **Confirmation**: each detection reviewed on radiometric R-JPEG; temperature contrast ≥ `{{CONTRAST}}` °C above ambient substrate
3. **Species attribution**: RGB confirmation where thermal signature is ambiguous; probabilistic tagging ("likely deer", "deer — confirmed RGB") with confidence
4. **Double-counting mitigation**: GPS-tag each detection; deduplicate detections within `{{DEDUP_RADIUS}}` m between passes within `{{DEDUP_TIME}}` min; group-size heuristic
5. **Age/sex classification** (where requested): antler detection RGB; body-size proxy thermal

### 3.4 Population Estimation

- **Estimator**: `{{ESTIMATOR}}` (distance sampling `distance` R package v`{{VER}}` / mark-resight / double-observer / simple count with visibility correction)
- **Visibility bias correction**: `{{CORRECTION}}` (sight-ability model `{{MODEL_REF}}`, canopy cover `{{CANOPY}}`%, detection probability `{{P_DETECT}}`)
- **Variance estimator**: `{{VARIANCE}}` (analytical / bootstrap `{{N_BOOTSTRAP}}` iterations)
- **Confidence interval**: 95% via `{{CI_METHOD}}`

## 4. Environmental Conditions at Survey

| Parameter | Value |
|---|---|
| Air Temperature | `{{AIR_T}}` °C at flight altitude |
| Ground/Substrate Temperature | `{{GND_T}}` °C (measured via IR thermometer or calibrated panel) |
| Thermal Contrast Available | `{{CONTRAST}}` °C (body-substrate — thermal detection viability threshold) |
| Wind | `{{WIND}}` kts @ `{{WIND_DIR}}` |
| Sky Condition | `{{SKY}}` (impacts thermal background) |
| Precipitation Last 24h | `{{PRECIP}}` (wet vegetation degrades thermal) |
| Moon Phase / Illumination | `{{MOON}}` % (relevant for nocturnal behavior) |
| Sunrise / Sunset | `{{SR}}` / `{{SS}}` local |
| Habitat Phenology | `{{PHENOLOGY}}` (leaf-on/leaf-off; critical for canopy correction) |

## 5. Findings — Population Results

### 5.1 Raw Detection Summary

| Transect | Length (km) | # Detections | Group Sizes | Raw Count | Encounter Rate (ind/km) |
|---|---|---|---|---|---|
| T-01 | | | | | |
| T-02 | | | | | |
| ... | | | | | |
| **Total** | `{{TOTAL_KM}}` | `{{DET}}` | range `{{MIN}}`–`{{MAX}}` | `{{RAW}}` | `{{RATE}}` |

### 5.2 Corrected Population Estimate

| Metric | Value | 95% CI |
|---|---|---|
| Total population estimate | `{{N}}` | `{{CI_L}}` – `{{CI_H}}` |
| Density (individuals / km²) | `{{DENSITY}}` | `{{D_L}}` – `{{D_H}}` |
| Detection probability | `{{P}}` | `{{P_L}}` – `{{P_H}}` |
| Coefficient of variation (CV) | `{{CV}}` % | — |

### 5.3 Demographic Breakdown (where determined)

| Class | Count | % of Population | Notes |
|---|---|---|---|
| Adult Male | | | Antlered (deer) / mature plumage |
| Adult Female | | | |
| Juvenile / Subadult | | | |
| Unclassified | | | Could not determine from imagery |

### 5.4 Spatial Distribution

- **Density heatmap**: `{{HEATMAP_FILE}}.pdf` — kernel density estimate, `{{BANDWIDTH}}` m bandwidth
- **Hotspot analysis**: Getis-Ord Gi* with `{{DISTANCE}}` m fixed band — clusters at `{{LOCATIONS}}`
- **Habitat association**: detections by habitat class (chi-square against area-expected)

## 6. Temporal Comparison (if recurring survey)

| Survey Date | Method | Population Est. | 95% CI | Density | Δ vs. Prior |
|---|---|---|---|---|---|
| `{{PRIOR}}` | | | | | baseline |
| **`{{CURRENT}}`** | Drone thermal | `{{N}}` | | | `{{DELTA}}` |

Trend interpretation: `{{TREND}}` (stable / increasing / declining — with statistical test e.g., generalized linear model).

## 7. Management Recommendations

*Actionable, tied to the survey purpose. Keep to 3-7 bullets.*

1. `{{REC_1}}` (e.g., "Quota recommendation: `{{X}}` antlerless tags for the 2026-27 season to move population toward biological carrying capacity estimate of `{{K}}`")
2. `{{REC_2}}`
3. `{{REC_3}}`

## 8. Data Products Delivered

| Product | Description | File |
|---|---|---|
| Detection shapefile | Each detection as point feature with attributes (species, count, confidence, timestamp) | `detections.gpkg` |
| Density raster | Kernel density estimate, 10 m resolution | `density_kde.tif` |
| Transect KMLs | Flight lines + planned vs actual | `transects.kml` |
| Hotspot map | PDF, print-ready | `hotspot_map.pdf` |
| Radiometric archive | Raw R-JPEGs + video | `thermal_raw/` |
| Confirmation stills | RGB stills at each ambiguous detection | `rgb_confirmations/` |
| Flight logs | CSV per sortie | `flightlogs/*.csv` |
| Raw counts per observer | For reproducibility / QA | `counts_observer1.csv`, `counts_observer2.csv` |
| R analysis script | Reproducible population estimation | `census_analysis.R` |

## 9. Peer Review & Quality Assurance

- **Independent review**: `{{REVIEWER}}` re-counted `{{REVIEW_PCT}}`% of transects blind; inter-observer agreement `{{AGREEMENT}}` (Cohen's κ)
- **Ground-truth validation** (if performed): `{{VALIDATION}}` (spotlight survey, camera trap, harvest data)
- **Known-population test** (if available): `{{TEST_RESULT}}`

## 10. Limitations, Assumptions & Disclaimers

*Include `_shared/limitations_disclaimers.md` Section A (general) + B.1 (wildlife) + C (engagement-specific).*

## 11. Accuracy Statement

*Include `_shared/accuracy_statement.md` for detection-geolocation accuracy (relevant for spatial analyses).*

## 12. Compliance & PIC Attestation

*Include `_shared/compliance_attestation.md`. Add species-specific regulatory notes where relevant:*

- Endangered Species Act considerations: `{{ESA_NOTE}}` (Section 7 consultation if federal nexus)
- Migratory Bird Treaty Act: `{{MBTA_NOTE}}` (disturbance avoidance)
- State wildlife agency permits: `{{PERMIT}}` (scientific collecting permit # if nests/roosts involved)

## 13. Chain of Custody

*Include `_shared/chain_of_custody.md` for research-grade and harvest-quota-informing reports.*

## 14. References

*Peer-reviewed literature underpinning the methodology. Include at minimum:*

- Beaver, J.T. et al. (2020). "Evaluating the use of drones equipped with thermal sensors as an effective method for estimating wildlife." *Wildlife Society Bulletin* 44(2).
- Chabot, D. & Bird, D.M. (2015). "Wildlife research and management methods in the 21st century: Where do unmanned aircraft fit in?" *Journal of Unmanned Vehicle Systems* 3(4).
- `{{ADDITIONAL_REFS}}`

## 15. Appendices

- **Appendix A** — Flight logs (per sortie)
- **Appendix B** — Transect-by-transect detection table
- **Appendix C** — Detection photos (confirmation imagery)
- **Appendix D** — Density heatmaps (full resolution)
- **Appendix E** — R analysis outputs (raw)
- **Appendix F** — Pre-flight briefing / risk assessment
- **Appendix G** — Client-supplied background data (prior surveys, harvest records)

---

*This report was prepared by Sentinel Aerial Inspections. Questions regarding methodology or findings: info@sentinelaerialinspections.com.*
