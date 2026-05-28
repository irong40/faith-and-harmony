# Search and Rescue (SAR) Thermal Mission — After-Action Report — SAI Template

> **Service line**: SAR support to public-safety agencies, law-enforcement, and fire/EMS; thermal aerial search for missing persons, fugitives, evidence
> **Grade**: Public-safety / Potentially evidentiary
> **Based on**: NFPA 1670 (Standard on Operations and Training for Technical Search and Rescue), ASTM F3002 (UAS SAR operations), NIST Interagency Board UAS SAR guidance, NIMS/ICS forms (201, 214)
> **Cover letterhead**: `letterhead.html` with `{{DOCUMENT_TYPE}} = "SAR Mission After-Action Report"`

---

## 1. Incident Identification

| Field | Value |
|---|---|
| Incident Name | `{{INCIDENT_NAME}}` |
| Tasking Authority | `{{AGENCY}}` (IC, sheriff, fire, NPS, USCG) |
| Incident # (ICS 201 ref) | `{{INCIDENT_NUM}}` |
| Incident Commander | `{{IC_NAME}}`, `{{IC_AGENCY}}` |
| UAS Unit Leader (SAI) | `{{PIC_NAME}}` |
| SAI Ground Crew | `{{CREW}}` |
| Date of Tasking | `{{TASK_DATE}}` |
| Date(s) of Operations | `{{OP_DATES}}` |
| Date of This Report | `{{REPORT_DATE}}` |
| Location of Operations | `{{LOCATION}}` (jurisdiction + general area) |
| Operational Period(s) | `{{OP_PERIODS}}` (ICS 202 ref) |

## 2. Subject / Target Description

*Redact identifying info if investigation is ongoing — see §10 handling.*

- **Subject type**: missing person / fugitive / overdue party / evidence / `{{OTHER}}`
- **Description summary**: `{{DESC}}` (sex, age band, clothing, last-known condition)
- **Point Last Seen (PLS) / Last Known Point (LKP)**: `{{LAT}}, {{LONG}}`, time `{{TIME}}`
- **Time elapsed at tasking**: `{{ELAPSED}}`
- **Likely behavior profile referenced**: `{{BEHAVIOR}}` (ISRID data if applicable, lost-person-behavior category)
- **Special considerations**: `{{CONSIDERATIONS}}` (medical, cognitive, armed subject warning, etc.)

## 3. Mission Objectives

- **Primary**: `{{PRIMARY}}` (locate subject / clear search area to defined probability / locate evidence)
- **Secondary**: `{{SECONDARY}}` (document hazards, support ground teams, establish coordination comm relay)
- **Task assignment reference (ICS 204)**: `{{TA_REF}}`
- **Briefed POD target**: `{{POD_TARGET}}` % within assigned search segments

## 4. Search Area Definition

- **Assigned segments**: `{{SEGMENTS}}` (per IC map — see Appendix B)
- **Total area assigned**: `{{AREA}}` acres / `{{KM2}}` km²
- **Terrain / Environment**: `{{TERRAIN}}` (open field, forest — canopy %, water, urban interface)
- **Prior search history**: `{{PRIOR_TEAMS}}` (ground team coverage, prior POD estimates)

## 5. UAS Flight Operations

### 5.1 Mission Sortie Log (per flight)

| Sortie # | Start (local/UTC) | End (local/UTC) | Area | Altitude AGL | Speed | Pattern | PIC | VO | Battery | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | Segment A | `{{ALT}}` ft | `{{SPD}}` m/s | grid / contour / contracting-square | | | `{{START}} → {{END}}` | |
| 2 | | | | | | | | | | |

### 5.2 Aircraft & Sensor Configuration

| Item | Value |
|---|---|
| Aircraft | `{{AIRCRAFT}}` |
| FAA Reg. | `{{REG}}` |
| Remote ID status | Active / broadcast verified |
| Thermal sensor | `{{MODEL}}` (NETD `{{NETD}}` mK, resolution `{{RES}}`) |
| RGB sensor | `{{RGB}}` |
| Spotlight / searchlight | `{{Y/N}}` |
| Speaker / PA (if broadcasting to subject) | `{{Y/N}}` |
| Rangefinder (for geotagging detections) | `{{Y/N}}` |
| Night operations waiver (107.29) | `{{YES_with_ref / NO}}` |
| BVLOS waiver (107.31) | `{{YES_with_ref / NO}}` |
| Operations over non-participants (107.39) | `{{YES_with_ref / NO}}` — Cat 1/2/3/Waiver |

### 5.3 Coordination

- **Ground team integration**: radio channel `{{CHANNEL}}`, callsign `{{CALLSIGN}}`
- **Airspace deconfliction**: `{{METHOD}}` (ATC coordination / MANPRINT with manned aviation / NOTAM)
- **LAANC / waiver in effect**: `{{IDS}}`

## 6. Probability of Detection (POD)

### 6.1 Computed POD per Segment

| Segment | Area | Mean GSD (thermal) | Flight AGL | Overlap | Env. Penalty | POD (%) | POA Assumed |
|---|---|---|---|---|---|---|---|
| A | | `{{GSD}}` cm/px | | | canopy / wind / subject size | `{{POD}}` | POA `{{POA}}` |
| B | | | | | | | |

**Methodology**: POD computed per `{{METHOD}}` (e.g., inverse cube model / sweep-width method / empirical lookup from NIST IAB tables). Environmental penalties applied for canopy cover (reduces detection of supine subjects) and wind-induced motion blur.

### 6.2 POD Map

Print-ready POD overlay appended as Appendix C — graduated color ramp by segment.

## 7. Detections & Investigations

*Any heat signature evaluated during the mission. This log is essential — it documents what the PIC saw, how it was investigated, and the disposition.*

| # | Time | Segment | GPS | Signature Description | Investigation Action | Ground Truth | Disposition |
|---|---|---|---|---|---|---|---|
| 1 | | | | Small heat signature, `{{SIZE}}` px, under canopy | Low-altitude hover, RGB zoom, ground team directed | Deer | Cleared |
| 2 | | | | Larger, human-sized signature, clothed appearance | Directed ground team; tagged GPS | Subject confirmed at `{{COORDS}}` | **FOUND** |
| 3 | | | | Residual heat at firepit | Logged for follow-up | Warm firepit — subject was here | Lead |

## 8. Summary of Outcomes

- **Subject located**: `{{YES/NO}}` — if yes: `{{TIME}}` at `{{COORDS}}` by `{{RESOURCE}}` (SAI air / ground team / self-located)
- **Search area cleared to POD ≥ target**: `{{YES/NO}}` (by segment)
- **Evidence / leads identified**: `{{LIST}}`
- **Hazards documented**: `{{HAZARDS}}` (for ground team safety — open water, cliffs, active road crossings)
- **Mission duration (SAI)**: `{{HOURS}}` hrs

## 9. Chain of Custody — Imagery & Flight Data

*Mandatory inclusion of `_shared/chain_of_custody.md` because SAR imagery may become evidence (missing-person case, recovery scene, related criminal investigation).*

Additional points:
- All raw radiometric files hashed (SHA-256) at ingest; manifest retained
- Flight logs preserved in native format + CSV export
- No media destruction until case closure plus `{{RETENTION}}` retention period, or IC written release

## 10. Handling, Privacy & Legal Notes

- This report and accompanying imagery may contain protected information (medical status of subject, ongoing investigation details). Classify and route per:
  - State open-records law exception for active investigation: `{{STATE_STATUTE}}`
  - HIPAA considerations if subject's medical status reflected
  - Minor subjects: additional handling per agency SOP
- Distribution limited to IC, tasking-agency records system, and SAI internal mission archive
- No SAI public-facing social media, marketing, or portfolio use of any imagery from this mission unless the IC issues written release

## 11. Lessons Learned / After-Action

- **What worked**: `{{ITEMS}}`
- **What didn't**: `{{ITEMS}}`
- **Equipment issues**: `{{ITEMS}}`
- **Recommendations for next engagement**: `{{ITEMS}}`
- **Training gaps identified**: `{{ITEMS}}`

## 12. Compliance Attestation

*Include `_shared/compliance_attestation.md`.*

SAR-specific additional attestations:
- PIC carries current Part 107 certificate + operating waivers as used
- Night operation (if applicable) complied with 107.29 waiver conditions, including anti-collision lighting visible from 3 statute miles
- BVLOS (if applicable) operated under waiver `{{ID}}` with tested VOs and communication protocol as specified
- All over-person operations met applicable Category 1/2/3 or waiver requirements
- Aircraft and payload airworthy per pre-flight inspection logged in flight record

## 13. Limitations & Disclaimers

*Include `_shared/limitations_disclaimers.md` Sections A + B.9 (SAR) + C.*

Mission-specific notes:
- POD is a statistical estimate, not a guarantee of completeness. Undetected subjects may exist within swept areas.
- Thermal contrast was `{{CONTRAST}}` — note that subject detection degrades in conditions of thermal washout, dense canopy, or subject immersion (water).
- Ground-team coordination assumed; discrepancies between air and ground reports are documented in §7.

## 14. Accuracy Statement

*Include `_shared/accuracy_statement.md`.*

Critical for SAR: detection geolocation accuracy (typically ± 2-5 m GPS + rangefinder-aided estimate) governs handoff quality to ground teams.

## 15. Appendices

- **A** — Full sortie flight logs (digital + printed)
- **B** — Assigned search segments map (from IC)
- **C** — Computed POD map
- **D** — All detection investigation photo/thermal plates
- **E** — Sensor calibration verification (pre-mission)
- **F** — Waiver documentation (107.29 / 107.31 / 107.39 as applicable)
- **G** — Chain of custody log + SHA-256 manifest
- **H** — Coordination log with ground teams / IC
- **I** — Attending-agency signature block (IC acknowledgment of receipt)

---

**Report receipt acknowledged by Incident Commander**:

<table style="width:100%;border:none;margin-top:16px;">
<tr>
<td style="border:none; padding-right:20px;">
<div style="border-bottom:1px solid #000;height:40px;"></div>
<div style="font-size:9pt;color:#64607a;">IC signature</div>
<br>
<strong>{{IC_NAME}}</strong><br>
{{IC_TITLE}}, {{IC_AGENCY}}<br>
Date: {{IC_DATE}}
</td>
<td style="border:none;">
<div style="border-bottom:1px solid #000;height:40px;"></div>
<div style="font-size:9pt;color:#64607a;">SAI UAS Unit Leader</div>
<br>
<strong>{{PIC_NAME}}</strong><br>
Part 107 {{CERT}}<br>
Date: {{SIGN_DATE}}
</td>
</tr>
</table>

---

*Questions: secure channel to info@sentinelaerialinspections.com.*
