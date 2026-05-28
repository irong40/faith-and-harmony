# Solar Array Thermal Inspection Report — SAI Template

> **Service line**: Residential and commercial solar PV array thermal inspection; anomaly detection, string/panel health, soiling assessment
> **Grade**: Commercial / O&M / Warranty-Claim
> **Based on**: IEC TS 62446-3:2017 (PV system testing with infrared thermography), NABCEP inspection guidelines
> **Cover letterhead**: `letterhead.html` with `{{DOCUMENT_TYPE}} = "Solar Thermal Inspection"`

---

## 1. Executive Summary

- **Site**: `{{SITE_NAME}}` — `{{ADDRESS}}`
- **System Size**: `{{KW_DC}}` kW-DC / `{{KW_AC}}` kW-AC
- **Array Configuration**: `{{N_PANELS}}` modules, `{{N_STRINGS}}` strings, `{{N_INVERTERS}}` inverters
- **Inspection Date**: `{{DATE}}`
- **Anomalies Detected**: `{{TOTAL}}` total — `{{CRIT}}` critical, `{{MAJOR}}` major, `{{MINOR}}` minor
- **Estimated Production Impact**: `{{PCT}}` % of nameplate capacity (pre-remediation)
- **Headline Finding**: `{{HEADLINE}}` (e.g., "2 modules with suspected bypass-diode failure on String 4; array otherwise within healthy thermal operation")

## 2. Inspection Objectives

- **Primary**: identify thermal anomalies indicative of module, cell, interconnect, bypass diode, or soiling-related performance defects
- **Secondary**: baseline condition documentation for O&M contract or warranty claim
- **Tertiary**: validate recent repair / post-replacement verification

## 3. System Description

| Field | Value |
|---|---|
| System commissioned | `{{COD}}` |
| Module make / model | `{{MFG}} / {{MODEL}}` — `{{WATTS}}` W nameplate |
| Module technology | `{{TECH}}` (mono-Si / poly-Si / thin-film / bifacial) |
| Inverter make / model | `{{INV_MFG}} / {{INV_MODEL}}` |
| Racking | `{{RACKING}}` (rooftop / ground-mount / tracker) |
| Tilt / Azimuth | `{{TILT}}° / {{AZIMUTH}}°` |
| Monitoring platform | `{{PLATFORM}}` (Enphase / SolarEdge / APsystems / SMA Sunny Portal / other) |
| Last O&M visit | `{{LAST_OM}}` |
| Warranty coverage in force | Product: `{{Y/N}}` / Performance: `{{Y/N}}` |

## 4. Inspection Conditions

*IR inspection validity requires specific environmental conditions per IEC 62446-3.*

| Parameter | Requirement | Measured | Within Spec? |
|---|---|---|---|
| Irradiance | ≥ 600 W/m² (preferred ≥ 700) | `{{IRRADIANCE}}` W/m² | YES / NO |
| Wind | ≤ 4 m/s (preferred ≤ 2) | `{{WIND}}` m/s | YES / NO |
| Sky condition | Clear or thin cirrus | `{{SKY}}` | YES / NO |
| Ambient temperature | > 0°C, stable | `{{TEMP}}` °C | YES / NO |
| Module state | Grid-connected, operating under load | `{{STATE}}` | YES / NO |
| Time of day | Solar noon ± 3h | `{{TOD}}` | YES / NO |

**Validity statement**: Inspection conditions `{{WERE / WERE NOT}}` fully within IEC 62446-3 requirements. Out-of-spec conditions are noted and their impact on detection sensitivity is explained in §8.

## 5. Methodology

- **Flight pattern**: `{{PATTERN}}` (nadir raster + oblique orbits per array section)
- **Altitude**: `{{ALT}}` ft AGL; GSD thermal `{{GSD_T}}` cm/px (sufficient to resolve cell-level anomalies per IEC 62446-3 at min pixel per cell = 3)
- **Thermal sensor**: `{{MODEL}}` — `{{RES}}` resolution, `{{SPEC}}` spectral band, NETD `{{NETD}}` mK
- **Palette & range**: White-Hot at acquisition; Iron/Rainbow post-processing overlays
- **Emissivity setting**: `{{EM}}` (glass front default 0.85, module-specific if manufacturer-provided)
- **Reflected temperature compensation**: `{{RT}}` °C (sky temp measurement)
- **Calibration verification**: pre-flight calibration target `{{TARGET}}` imaged with `{{RESULT}}` validation

## 6. Anomaly Classification & Severity

Classification per IEC TS 62446-3 Annex A.

| Code | Type | Description | Typical Cause |
|---|---|---|---|
| HS | Hot spot | Localized cell heating > 10°C above module average | Cell crack, mismatch, shading, delamination |
| MH | Module hot | Entire module hotter than array mean by > 5°C | Bypass diode failure, string imbalance, disconnect |
| SH | Sub-module hot | Half/third of module hot | Bypass diode in affected section failed, partial shading |
| SM | String mismatch | One string consistently warmer/cooler than others | Connector, fuse, or string cabling issue |
| JB | Junction box hot | Back-of-module JB anomaly | Failed solder joint, diode failure |
| SO | Soiling | Uniform or patterned temperature elevation | Bird droppings, dust, snow, vegetation growth |
| PS | Partial shading | Geometric cold area from obstruction | External (tree, HVAC), self-shading |
| OT | Other | Does not fit above | — |

**Severity (1-3)**:
- **3 — Critical**: safety risk (arcing, >40°C above ambient), immediate de-energization recommended
- **2 — Major**: significant production loss (>5% per module), warranty claim viable, repair within 30 days
- **1 — Minor**: marginal loss, monitor and address at next scheduled O&M

## 7. Findings

### 7.1 Anomaly Inventory

| # | Array Sector | String # | Module Location | Type Code | ΔT Apparent | Severity | GPS | Photo Ref |
|---|---|---|---|---|---|---|---|---|
| 1 | North field | S-04 | Row 3, Pos 12 | HS | +14°C | 3 | `{{GPS}}` | Fig 7.1a, 7.1b |
| 2 | | | | | | | | |

### 7.2 String-Level Aggregation

| String | Modules | # Anomalies | Estimated String Health | Recommended Action |
|---|---|---|---|---|
| S-01 | `{{N}}` | 0 | Healthy | Continue monitoring |
| S-02 | | | | |
| S-04 | | | `{{%}}` nominal | Investigate combiner / inverter data |

### 7.3 Soiling Assessment

- **Uniform soiling**: `{{LEVEL}}` (none / light / moderate / heavy)
- **Localized soiling** (bird droppings, debris): `{{COUNT}}` locations — see map
- **Vegetation encroachment**: `{{FINDINGS}}`
- **Estimated soiling production loss**: `{{PCT}}` % (rough estimate based on thermal signature)

### 7.4 Physical / Visual Defects (RGB pass)

| # | Defect | Location | Notes |
|---|---|---|---|
| | Cracked glass, delamination, discoloration, wiring exposed | | |

## 8. Production Impact Estimate

Method: sum of anomaly production loss estimates against nameplate. Assumptions stated in §12.

| Issue Category | Est. Loss % | Est. Annual Energy Loss (kWh) | Est. Annual Revenue Loss @ $/kWh `{{RATE}}` |
|---|---|---|---|
| Critical anomalies | `{{P}}` | | |
| Major anomalies | | | |
| Minor anomalies | | | |
| Soiling | | | |
| **Total** | `{{TOTAL}}` | `{{KWH}}` | `{{DOLLARS}}` |

*Estimates are indicative; actual loss depends on operating hours, irradiance profile, and remediation timeliness.*

## 9. Recommended Actions

1. **Immediate (0-7 days)**: `{{ITEMS}}`
2. **Near-term (within 30 days)**: `{{ITEMS}}`
3. **Scheduled (with next O&M)**: `{{ITEMS}}`
4. **Monitor only**: `{{ITEMS}}`

Where bypass diode failure is suspected, recommend IV-curve testing and/or electroluminescence (EL) imaging for confirmation.
Where soiling is material, recommend professional wash cycle and post-wash re-inspection to quantify recovery.

## 10. Visual Deliverables

- Annotated thermal orthomosaic (full array)
- Per-string thermal ribbon (side-by-side strings for mismatch visualization)
- Per-anomaly fact sheet (thermal + RGB pair + temperature statistics)
- RGB orthomosaic overlay with anomaly pins
- KMZ for Google Earth review by O&M team

## 11. Data Products Delivered

| Product | File |
|---|---|
| Report PDF | `SAI-{{ID}}-report.pdf` |
| RGB orthomosaic | `rgb_ortho.tif` |
| Thermal orthomosaic | `thermal_ortho.tif` (radiometric) |
| Anomaly GIS | `anomalies.gpkg` |
| Per-anomaly fact sheets | `anomalies/A-0001.pdf` … |
| Raw R-JPEGs | `raw_thermal/` |
| KMZ for Google Earth | `array_anomalies.kmz` |
| Flight logs | `logs/*.csv` |

## 12. Accuracy Statement & Assumptions

- **ΔT measurement uncertainty**: ± `{{UNC}}` °C accounting for sensor NETD, emissivity variability, reflected temperature, atmospheric correction
- **Production-loss estimates** assume `{{PR}}` performance ratio and the quoted ΔT correlates with manufacturer-reported degradation at `{{RATIO}}` % per °C
- **Per-module localization accuracy**: `{{LOC}}` cm under RTK + GCP; sufficient to pin anomalies to individual modules at the given array layout

## 13. Limitations & Disclaimers

*Include `_shared/limitations_disclaimers.md` Sections A + B.3 (solar) + C.*

Solar-specific:
- Thermal anomalies indicate temperature differentials — not root cause. Electrical testing (IV-curve, insulation resistance, EL imaging) is required for definitive fault diagnosis.
- Back-of-module thermal signatures (junction box issues) are not accessible from nadir aerial view; oblique shots attempted but may be obstructed by racking.
- This inspection does not constitute NABCEP-certified system audit unless expressly performed by a NABCEP-credentialed inspector.

## 14. Compliance Attestation

*Include `_shared/compliance_attestation.md`.*

## 15. Appendices

- **A** — Thermal orthomosaic (high-resolution print)
- **B** — RGB orthomosaic
- **C** — Per-anomaly fact sheets (`{{N}}` anomalies)
- **D** — String-by-string thermal ribbons
- **E** — Flight logs + irradiance sensor log + weather
- **F** — Calibration target imagery + verification

---

*Questions: info@sentinelaerialinspections.com.*
