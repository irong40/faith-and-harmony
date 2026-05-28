# Roof Inspection Report — SAI Template

> **Service line**: Residential / commercial roof condition assessment (non-claim). For post-loss insurance documentation, use `insurance-damage.md`.
> **Grade**: Commercial / Real-Estate-Transaction / Maintenance-Planning
> **Based on**: HAAG inspector terminology, NRCIA template structure, ASTM E2128
> **Cover letterhead**: `letterhead.html` with `{{DOCUMENT_TYPE}} = "Roof Condition Inspection"`

---

## 1. Executive Summary

- **Property**: `{{ADDRESS}}`
- **Inspection Date**: `{{DATE}}`
- **Roof System**: `{{COVER}}` on `{{SUBSTRATE}}`, `{{SQUARES}}` squares, `{{FACETS}}` facets, `{{PITCH}}` pitch
- **Estimated Age**: `{{AGE}}` years
- **Overall Condition Rating**: **`{{RATING}}`** / 5 (see §3.3 scale)
- **Estimated Remaining Useful Life**: `{{RUL}}` years (conditions permitting)
- **Priority Findings**: `{{COUNT}}` items requiring attention — see §4
- **Recommendation Tier**: `{{TIER}}` (monitor / repair / plan replacement / immediate action)

## 2. Scope of Inspection

- **Requested by**: `{{REQUESTER}}` (owner / agent / property manager / prospective buyer / PM company)
- **Purpose**: `{{PURPOSE}}` (pre-purchase DD / annual inspection / maintenance plan / warranty claim / real-estate listing)
- **Areas inspected**: `{{AREAS}}` (main roof, detached structures, gutters, fascia, soffit, penetrations, rooftop equipment)
- **Areas excluded**: `{{EXCLUSIONS}}` (interior attic — not part of aerial scope, trees obscuring `{{AREA}}`, solar-panel-covered portions)
- **Standards referenced**:
  - ASTM E2128 — *Standard Guide for Evaluating Water Leakage of Building Walls*
  - NRCA *Roofing Manual* (2024) for material-specific wear patterns
  - Manufacturer install specifications where shingle brand identifiable

## 3. Roof System Inventory

### 3.1 Dimensioned Measurements

| Item | Quantity | Source |
|---|---|---|
| Total squares | `{{SQ}}` | Photogrammetric measurement, orthomosaic |
| Ridge | `{{LF}}` LF | |
| Hip | `{{LF}}` LF | |
| Valley | `{{LF}}` LF | |
| Eave | `{{LF}}` LF | |
| Rake | `{{LF}}` LF | |
| Facets (count) | `{{N}}` | |
| Penetrations (count) | `{{N}}` | Vents, stacks, chimneys, skylights |
| Pitch (dominant) | `{{PITCH}}` | |

### 3.2 Materials Identified

| Component | Material | Manufacturer (if identifiable) | Age Estimate |
|---|---|---|---|
| Roof cover | `{{COVER}}` | `{{BRAND}}` | `{{AGE}}` yrs |
| Underlayment | `{{TYPE}}` (visible at exposed edges only) | | |
| Ridge cap | `{{TYPE}}` | | |
| Flashing | `{{MATERIAL}}` | | |
| Gutters | `{{MATERIAL}}` + `{{COLOR}}` | | |
| Fascia | `{{MATERIAL}}` | | |

### 3.3 Condition Rating Scale

| Rating | Condition | Action |
|---|---|---|
| 5 — Excellent | New / like-new; no wear indicators | Monitor |
| 4 — Good | Minor wear, full remaining life | Routine maintenance |
| 3 — Fair | Visible wear, partial life remaining, localized issues | Repair + plan for replacement |
| 2 — Poor | Significant wear, nearing end-of-life, multiple defects | Plan replacement |
| 1 — Failed | Active failure, leaks likely, structural concerns | Immediate action |

## 4. Findings by Facet / System

### 4.1 Facet-by-Facet Inspection

| Facet | Orientation | Area (sq) | Condition (1-5) | Primary Observations | Photo Refs |
|---|---|---|---|---|---|
| A | South | | | Moderate granule loss, `{{N}}` cracked shingles | 4.1a–4.1d |
| B | West | | | | |
| C | North | | | | |
| D | East | | | | |

### 4.2 Component-Level Findings

**Ridge & hip caps**: `{{FINDINGS}}`
**Valleys**: `{{FINDINGS}}` (open metal / closed-cut / closed-woven, condition)
**Eave & drip edge**: `{{FINDINGS}}`
**Step flashing / counter-flashing**: `{{FINDINGS}}`
**Penetrations (vents, stacks)**: `{{FINDINGS}}` (boot condition, mastic age, cracking)
**Chimney**: `{{FINDINGS}}` (crown, flashing, pointing)
**Skylights**: `{{FINDINGS}}` (seal, flashing integrity)
**Gutters & downspouts**: `{{FINDINGS}}` (attachment, slope, debris, deformation)
**Fascia & soffit (visible portions)**: `{{FINDINGS}}`

### 4.3 Active / Historical Leak Indicators

*Thermal pass or visual moisture staining — if scoped/observed.*

| Zone | Indicator | Severity | Recommended Action |
|---|---|---|---|
| | | | |

### 4.4 Priority Action List

| # | Item | Severity | Est. Priority | Notes |
|---|---|---|---|---|
| 1 | | `{{SEV}}` | Immediate / 30-day / 90-day / annual | |
| 2 | | | | |

## 5. Photographic Evidence

*Each facet documented at minimum: wide establishing shot → oblique orbit → close-up of any defect. Photos numbered to match §4 findings.*

- Orthomosaic overview (top-down): Appendix A
- Orbit imagery (4 cardinal + corners): Appendix B
- Close-up evidence for each finding: Appendix C
- Thermal overlay (if scoped): Appendix D

## 6. Estimated Remaining Useful Life

- **Material**: `{{COVER}}` — manufacturer-rated life `{{RATED}}` years
- **Observed wear**: `{{WEAR_INDICATORS}}`
- **Environmental factors**: `{{FACTORS}}` (sun exposure, tree cover, coastal salt, climate zone)
- **Estimated RUL**: `{{RUL}}` years assuming routine maintenance and absence of severe weather events
- **RUL basis disclaimer**: estimate only; not a warranty; does not account for future storms, impact events, or defects not visible from aerial perspective

## 7. Recommendations

1. `{{REC}}` — immediate (within 30 days)
2. `{{REC}}` — near-term (30-90 days)
3. `{{REC}}` — planning horizon (within 12 months)
4. Engage a licensed roofing contractor for physical hands-on inspection of `{{SPECIFIC_AREAS}}` where aerial assessment is inconclusive
5. `{{OTHER}}`

## 8. Cost Estimation (if contracted)

*SAI does not provide construction cost estimates as a default service. When contracted:*

| Scope | Quantity | Unit Reference | Estimated Range |
|---|---|---|---|
| | | RSMeans 2026 / local contractor survey | `{{LOW}} – {{HIGH}}` |

*Estimates are range-only for budgeting; bind a contractor bid for actionable pricing.*

## 9. Data Products Delivered

| Product | File |
|---|---|
| PDF report (this document) | `SAI-{{ID}}-report.pdf` |
| Orthomosaic | `ortho.tif` |
| 3D roof model | `roof_model.obj` |
| Facet measurement sketch | `measurements.pdf` |
| Evidence photos | `photos/` |
| Thermal (if scoped) | `thermal/` |

## 10. Limitations & Disclaimers

*Include `_shared/limitations_disclaimers.md` Sections A + B.2 (roof) + C.*

## 11. Accuracy Statement

*Include `_shared/accuracy_statement.md` — relevant for dimensioned measurements.*

## 12. Compliance Attestation

*Include `_shared/compliance_attestation.md`.*

## 13. Appendices

- **A** — Orthomosaic (print-ready + geo-referenced)
- **B** — Orbit imagery (all 4 cardinals)
- **C** — Defect close-up plates (numbered to §4)
- **D** — Thermal imagery (if scoped)
- **E** — Flight logs + LAANC auth
- **F** — Facet measurement sketch

---

*Questions: info@sentinelaerialinspections.com.*
