# Corrections Facility — Perimeter / Fence Inspection Report (CUI-MARKED) — SAI Template

> **Service line**: Perimeter security condition assessment for correctional, detention, and secure government facilities
> **Grade**: Government / Secure — CUI / FOUO handling required
> **Based on**: ASTM F2781 (Physical Security in Correctional Facilities), ACA Performance-Based Standards 4-ACRS (Adult Correctional Institutions), facility-specific SOPs
> **Cover letterhead**: `letterhead.html` with classification banner enabled and `{{DOCUMENT_TYPE}} = "Perimeter Inspection Report"`
> **Distribution**: RESTRICTED per §2

---

<div class="classification-banner" style="background:#8b1a1a;color:#fff;text-align:center;padding:6px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">CONTROLLED UNCLASSIFIED INFORMATION (CUI)</div>

**CUI / SP-LEI (Law Enforcement Information — Secure Facility Infrastructure)**
**Dissemination Controls**: FEDCON / NOCON (or facility-specific marking)
**Decontrol**: `{{DECONTROL_DATE_OR_EVENT}}`

---

## 1. Executive Summary

- **Facility**: `{{FACILITY_NAME}}` (name-redacted in external distribution)
- **Inspection Date**: `{{DATE}}`
- **Perimeter Length Inspected**: `{{LENGTH_LF}}` LF / `{{LENGTH_MI}}` mi
- **Segments Inspected**: `{{N}}` of `{{TOTAL}}` (`{{PCT}}`%)
- **Findings Summary**: `{{CRIT}}` critical, `{{MAJOR}}` major, `{{MINOR}}` minor
- **Urgent Recommendations**: `{{COUNT}}` items requiring action ≤ 48 hours (summary in §7; detail in §8)
- **Classification of this report**: CUI / distribute only to authorized facility personnel per §2

## 2. Distribution & Handling

This report contains information whose release could reasonably be expected to compromise the security of the referenced correctional facility. Handling requirements:

- **Classification**: CUI / `{{CUI_CATEGORY}}` (e.g., PRVCY, LEI, SP-CRIT — confirm with COR)
- **Marking**: Every page marked with classification banner in header/footer
- **Storage**: Password-protected digital file; printed copies stored in locked facility file room
- **Transmission**: Encrypted only (DoD SAFE / facility SFTP / approved cloud — never plain email or standard file share)
- **Authorized recipients**: `{{RECIPIENT_LIST}}` (Warden / Chief of Security / facility COR / contract COR only)
- **Retention**: per facility Records Retention Schedule `{{RRS}}`; SAI internal retention `{{RETENTION}}`
- **Destruction**: NIST SP 800-88 Rev. 1 compliant

## 3. Scope of Work

- **Tasking authority**: `{{CO}}` (Contracting Officer) / `{{COR}}` (COR)
- **Contract / TO #**: `{{CONTRACT}}`
- **Inspection objective**: `{{OBJECTIVE}}` (routine perimeter condition assessment / post-incident documentation / pre-accreditation audit support)
- **Perimeter elements inspected**:
  - [ ] Primary fence line (fabric, mesh, hardware)
  - [ ] Secondary / sally-port fencing
  - [ ] Topping (razor ribbon, concertina, anti-climb)
  - [ ] Perimeter road condition
  - [ ] Clear zones (interior and exterior)
  - [ ] Perimeter lighting (functional — daylight visual only, or NIGHT TEST)
  - [ ] Towers / camera poles (exterior, structural condition)
  - [ ] Sensor fence / vibration / fiber cable visible components
  - [ ] Gates, vehicle sally ports
- **Explicitly out of scope**: electronic system functional testing (control systems, access control, CCTV feed integrity), below-grade footings, embedded members not visible from exterior

## 4. Applicable Standards

| Standard | Relevance |
|---|---|
| ASTM F2781 | Standard practice for physical security in correctional facilities |
| ACA 4-ACRS-2A-08 | Perimeter security integrity |
| NIJ Standard-0320.01 | Perimeter fence requirements |
| Facility SOP `{{SOP_ID}}` | Site-specific requirements (redacted in external distribution) |
| Applicable state DOC policy | `{{POLICY_REF}}` |

## 5. Inspection Methodology

- **Aerial pattern**: perimeter traverse at `{{ALT}}` ft AGL, nadir + 45° oblique; redundant passes for each fence segment
- **GSD**: `{{GSD}}` cm/px — sufficient to identify `{{MIN_FEATURE}}` per fabric (e.g., 2-link separations on chain-link)
- **Close-up passes**: manual flight at `{{CLOSE_ALT}}` ft for each flagged anomaly; GSD ≤ 0.2 cm
- **Thermal pass** (if contracted): night flight at `{{THERMAL_ALT}}` ft AGL for perimeter lighting gap detection and vegetation overgrowth in dead zones
- **Segment identification**: perimeter divided into `{{N}}` segments matching facility stationing system; each anomaly geo-tagged and stationed
- **Operational coordination**: inspection deconflicted with facility count times, outdoor recreation, and tower manning; overflight of inmate population areas minimized

## 6. Findings Inventory

### 6.1 Anomaly Register (redacted sample below — full table in Appendix A)

| # | Segment | Station | Defect Type | Severity (1-5) | GPS (redact in external) | Photo Refs |
|---|---|---|---|---|---|---|
| 1 | Segment 03 | 1+47 | Fabric cut, `{{SIZE}}` cm vertical | `{{SEV}}` | redacted | Fig 6.1 |
| 2 | | | Erosion undermining, `{{DEPTH}}` cm | | | |
| 3 | | | Overgrowth obscuring line-of-sight | | | |
| 4 | | | Lighting pole lean / damage | | | |
| 5 | | | Topping breach (razor ribbon displaced) | | | |

### 6.2 Defect Types Observed (per ASTM F2781 taxonomy)

- **Fabric integrity**: cuts, tears, fatigue, separations at ties
- **Hardware**: loose/missing top-rail, bottom-rail, post caps; missing ties; corroded connectors
- **Foundation/earthwork**: erosion, washout, undermining, settlement, exposed fabric bottom
- **Clear zone**: vegetation overgrowth, accumulated debris, stored items, snow/ice mounding, small-animal burrows
- **Topping**: displaced razor ribbon, anti-climb damage, vine intrusion
- **Lighting**: burned-out fixtures (visual, daylight — supplement with facility-reported outages), physical damage
- **Structural elements**: damaged posts, tower base cracking, camera pole damage (without functional testing)
- **Sensor systems (visible only)**: damaged strain-relief, conduit damage, exposed cable
- **Gates**: warping, hardware wear, damaged seals/bollards

### 6.3 Severity Scale

| Sev | Definition | Response Expectation |
|---|---|---|
| 5 — Critical | Active breach or imminent failure; security compromise possible now | ≤ 24 hours |
| 4 — Major | Significant degradation; partial defense; exploit scenario viable under common conditions | ≤ 72 hours |
| 3 — Moderate | Degraded but functioning; exploit requires unlikely concurrence | ≤ 14 days |
| 2 — Minor | Early-stage wear; cosmetic or future-maintenance concern | Scheduled maintenance cycle |
| 1 — Informational | Observation; no defect | Log only |

### 6.4 Findings Summary Statistics

| Segment | # Defects | Severity Distribution (5/4/3/2/1) | Composite Score |
|---|---|---|---|
| 01 | | | |
| 02 | | | |
| `{{N}}` | | | |
| **Total** | | | |

## 7. Priority Recommendations (≤ 48 hours)

*Summary only in main body; detail in §8. Kept in Executive Summary-reachable location for COR routing.*

1. `{{REC}}` — segment `{{SEG}}`, anomaly # `{{N}}`, severity `{{S}}`
2. `{{REC}}`
3. `{{REC}}`

## 8. Detailed Recommendations

Organized by severity and segment. Each line references the anomaly register (§6.1) and the specific evidence plate (Appendix A).

## 9. Compliance Cross-Reference

| Facility Requirement | Referenced Standard | Compliance Observation |
|---|---|---|
| Fence integrity | ASTM F2781 §X.Y | `{{COMPLIANT / NON-COMPLIANT / PARTIAL}}` |
| Clear zone width | ACA 4-ACRS | |
| Perimeter lighting coverage | NIJ 0320.01 | |
| Sensor fence continuity | Facility SOP | |

## 10. Chain of Custody

*Full `_shared/chain_of_custody.md` block included here. Mandatory for all corrections / secure-facility deliverables.*

Additional handling: seal/unseal log maintained for any physical media; witnessed destruction at retention end.

## 11. Accuracy Statement

*Include `_shared/accuracy_statement.md`.*

Corrections-specific: defect localization to ± `{{LOC}}` cm under RTK; sufficient to attribute defects to unique posts/panels at typical fence configurations.

## 12. Limitations & Disclaimers

*Include `_shared/limitations_disclaimers.md` Sections A + B.8 (corrections) + C.*

Key limitations reinforced:
- Visual aerial assessment only — no functional electronic testing, no below-grade assessment, no embedded-member continuity testing.
- Thermal pass (if included) detects radiance differential, not function — lighting outages inferred, not verified.
- Overflight constraints: operations timed to avoid facility movements; incomplete coverage of segments blocked by tower activity is noted in §5.

## 13. Compliance Attestation

*Include `_shared/compliance_attestation.md` with additional attestations below.*

PIC and ground crew additional attestations:
- Background check status: `{{STATUS}}` (NCIC / state check on file per contract)
- Non-disclosure agreement: executed `{{DATE}}`, scope `{{SCOPE}}`
- Facility in-brief completion: `{{DATE}}`
- Flight plan pre-approval by facility security: `{{APPROVAL_REF}}`

## 14. Data Rights (Federal / Agency)

*Include `_shared/data_rights.md` — asserting Limited Rights for methodology; Government-purpose rights for deliverables per contract.*

## 15. Appendices (all CUI-marked)

- **A** — Full anomaly register + evidence plates
- **B** — Perimeter segment map (redacted in external distribution)
- **C** — Methodology plate (flight plan, altitudes, coverage map)
- **D** — Thermal pass findings (if contracted)
- **E** — Flight logs + weather
- **F** — Facility coordination log (entry/exit times, escorted movements)
- **G** — Chain of custody log + hash manifest
- **H** — PIC & crew clearance / NDA on file reference

---

<div class="classification-banner" style="background:#8b1a1a;color:#fff;text-align:center;padding:6px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-top:24px;">CONTROLLED UNCLASSIFIED INFORMATION (CUI)</div>

*Questions — secure channel only: `{{SECURE_CONTACT}}`.*
