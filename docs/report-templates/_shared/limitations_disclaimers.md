# Limitations, Assumptions & Disclaimers

> **Purpose**: Required at the end of every SAI report before the attestation. Protects SAI and gives the client an accurate picture of what the deliverable does and does not warrant. Tailor the service-line-specific block and keep the general block intact.

---

## A. General Limitations (applies to all reports)

1. **Point-in-time observation.** Findings in this report reflect conditions observed and data captured on the flight date(s) stated in the metadata header. Conditions may have changed since capture. This report does not predict future state.

2. **Scope boundaries.** This report addresses only the site area, systems, and questions defined in the Statement of Work. Features outside the defined area of interest are not analyzed even if visible in imagery.

3. **Visual-spectrum and sensor limitations.** Findings are derived from what the contracted sensors can observe. Subsurface, sub-vegetation, and occluded features are not captured. Thermal inspections detect differential radiance, not root cause; thermal findings are indicators that may warrant physical inspection by a qualified trade professional.

4. **Not a substitute for qualified professional inspection.** This report does not replace a physical hands-on inspection by a licensed engineer, architect, contractor, agronomist, biologist, surveyor, or other qualified professional where local, insurance, or regulatory requirements mandate one.

5. **No engineering certification.** Sentinel Aerial Inspections is not a Professional Engineering firm and this report does not constitute an engineering opinion, structural certification, or PE-stamped deliverable unless a licensed Professional Engineer is expressly named and signs the relevant section.

6. **Data accuracy envelope.** Measurements, volumes, counts, and derived products carry the uncertainty stated in the Accuracy Statement appendix. Figures cited without explicit uncertainty should be read with the uncertainty envelope declared there.

7. **Weather and airspace constraints.** Partial coverage, resolution degradation, or rescheduling due to weather, TFRs, airspace restrictions, or emergency traffic are documented in the Limitations section specific to this engagement.

8. **Third-party data.** Parcel boundaries, address information, and base-map context derive from public GIS sources (county assessor, USGS, FEMA) and are reproduced as-supplied. SAI does not warrant the accuracy of third-party reference data.

9. **No legal opinion.** This report does not constitute a legal opinion, appraisal, title examination, boundary survey, or adjudication of property rights. Where boundary lines are overlaid, they are approximate and derived from third-party GIS.

10. **Liability cap.** Per the Master Services Agreement, SAI's liability for errors, omissions, or consequential damages arising from use of this report is limited to the fees paid for the specific engagement.

## B. Service-Line-Specific Limitations

> *Copy the block matching the report type. Delete the others.*

### B.1 — Wildlife Census
- Detection probability < 1.0; reported counts are estimates with stated 95% confidence intervals, not exhaustive censuses.
- Visibility bias correction applied per `{{METHOD}}`; residual bias may exist under dense canopy, nighttime thermal washout, or deep-water habitat.
- Behavioral response (flight, flush) can lead to double-counting or under-counting; methodology mitigates but does not eliminate.
- Species identification is probabilistic at altitude; ambiguous detections are flagged and not attributed.

### B.2 — Roof / Structure Inspection
- Conditions observable only from exterior aerial perspective; interior, attic, structural, and electrical components are not assessed.
- Material age estimates derive from visible weathering and are approximate; confirm with manufacturer records.
- Hail, wind, and impact damage classification follows HAAG / IICRC terminology but does not constitute adjuster determination or Xactimate valuation.
- Hidden damage (beneath shingles, flashing, or membranes) is not detectable by aerial means and may exist beyond what is reported.

### B.3 — Solar Array Thermal
- Thermal anomalies indicate temperature differentials, not specific failure modes; electrical testing (IV curve, EL imaging) is recommended for confirmed defect causation.
- Inverter-level, string-level, and combiner-level data are not part of this deliverable unless separately contracted.
- Thermal contrast is influenced by irradiance, ambient temperature, panel cleanliness, and wind; measurements reflect conditions at capture time only.

### B.4 — Land Survey / Mapping / Orthomosaic
- Product is a photogrammetric orthomosaic, not a land-survey-certified plat. Boundaries, easements, and legal descriptions require a licensed surveyor.
- Vertical accuracy in vegetated areas is degraded (DSM, not DTM, unless LiDAR contracted).
- GCPs surveyed with RTK GNSS; accuracy statement per appendix governs.

### B.5 — Insurance Damage Documentation
- Report documents observed damage; it does not adjudicate coverage, causation, or valuation. Those determinations rest with the insurance adjuster and, where applicable, a licensed contractor.
- Pre-loss condition is not assessed unless pre-loss SAI imagery exists; comparatives rely on supplied third-party pre-loss data when referenced.
- Temporal attribution (when the damage occurred) cannot be established from post-event imagery alone.

### B.6 — Construction Progress
- Progress percentages are visual estimates cross-referenced against submitted schedule; they do not substitute for certified pay-application measurement.
- Stockpile volumes assume material density and angle of repose values provided by the contractor; density variance is the client's responsibility.
- Safety observations are informational; SAI is not a Competent Person under OSHA 29 CFR 1926 and does not issue safety citations.

### B.7 — Real Estate Aerial
- Imagery is delivered for marketing use. Measurements, acreage, and parcel overlays are approximate and are not represented as a legal survey.
- No representation is made about zoning, easements, flood status, or marketable title.

### B.8 — Corrections Fence / Perimeter Inspection
- Inspection is a visual condition assessment from the aerial perspective; embedded ground-contact members, below-grade footings, and electrified conductor continuity are not tested.
- Lighting, sensor, and control-system functionality are observed, not validated — functional testing of electronic security components is out of scope unless separately contracted.
- CUI handling: report distribution restricted per `{{SITE_SOP}}` and DFARS 252.204-7012.

### B.9 — Search and Rescue (SAR) Thermal
- Thermal detection is probabilistic; an undetected subject in the search area does not prove absence.
- Probability of Detection (POD) estimates are derived from flight parameters and environmental conditions per `{{PROTOCOL}}`; see POD map for zone-by-zone confidence.
- This report supports, but does not substitute for, ground search operations and the tasking Incident Commander's authority.

## C. Engagement-Specific Limitations

*Issues unique to this engagement — partial coverage, environmental constraints, client-imposed scope limits, equipment substitutions. List plainly; the client should not be surprised on delivery.*

- `{{LIMITATION_1}}`
- `{{LIMITATION_2}}`
- `{{LIMITATION_3}}`

## D. Assumptions Relied Upon

*Any information supplied by the client, third parties, or public sources that underpins findings in this report.*

| Assumption | Source | Impact if Wrong |
|---|---|---|
| `{{ASSUMPTION}}` | `{{SOURCE}}` | `{{IMPACT}}` |

---

*All limitations are presented in good faith. Clients are encouraged to discuss any limitation's impact on decision-making before acting on this report.*
