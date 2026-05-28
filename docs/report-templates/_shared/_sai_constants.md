# SAI Constants — Single Source of Truth

> **Fill this out once.** Every report template pulls its boilerplate (business identifiers, insurance, PIC credentials, contract references) from this file. When a value changes (UEI issued, insurance renewed, cert renewed), update it here and every subsequent report inherits.
>
> **Last updated**: `{{LAST_UPDATED_DATE}}` by `{{UPDATED_BY}}`
> **Review cadence**: quarterly, or on any event below

---

## 1. Legal Entity

| Field | Value | Notes |
|---|---|---|
| Legal Name | Faith & Harmony LLC | |
| DBA | Sentinel Aerial Inspections | |
| Business Structure | Limited Liability Company (single-member) | |
| State of Formation | Virginia | |
| EIN | `{{EIN}}` | Redact on external distribution |
| Formation Date | `{{FORMATION_DATE}}` | |
| Registered Agent | `{{AGENT}}` | |

## 2. Federal Contracting Identifiers

| Field | Value | Status / Expiry |
|---|---|---|
| UEI (SAM.gov) | `{{UEI}}` | ⚠ PENDING as of 2026-04-14 — update when issued |
| CAGE Code | `{{CAGE}}` | ⚠ Issued with SAM active registration |
| SAM.gov Registration Status | `{{SAM_STATUS}}` | Active / Submitted / Rejected |
| SAM.gov Registration Expiry | `{{SAM_EXPIRY}}` | Renew annually |
| DUNS (legacy, if referenced) | N/A — replaced by UEI April 2022 | |

## 3. Small-Business Certifications

| Certification | Status | Cert # / Ref | Expiry |
|---|---|---|---|
| SDVOSB (self-certified, SBA) | `{{SDVOSB_STATUS}}` | `{{SDVOSB_REF}}` | `{{SDVOSB_EXPIRY}}` |
| VOSB (VA Vets First) | `{{VOSB_STATUS}}` | `{{VOSB_REF}}` | `{{VOSB_EXPIRY}}` |
| VA SWaM (Small, Women-, Minority-Owned) | `{{SWAM_STATUS}}` | `{{SWAM_REF}}` | `{{SWAM_EXPIRY}}` |
| HUBZone | `{{HUBZONE_STATUS}}` | Check address eligibility annually | |
| 8(a) Business Development | `{{8A_STATUS}}` | | |

## 4. NAICS Codes

| NAICS | Description | Primary? |
|---|---|---|
| `{{NAICS_PRIMARY}}` | e.g., 541370 — Surveying and Mapping (except Geophysical) Services | Primary |
| `{{NAICS_2}}` | e.g., 541922 — Commercial Photography | |
| `{{NAICS_3}}` | e.g., 541990 — All Other Professional, Scientific, and Technical Services | |
| `{{NAICS_4}}` | e.g., 541715 — Research and Development in the Physical Sciences (wildlife census) | |
| `{{NAICS_5}}` | e.g., 561621 — Security Systems Services (corrections perimeter) | |

## 5. Insurance (Aviation & General Liability)

| Field | Value |
|---|---|
| Carrier | `{{INSURANCE_CARRIER}}` |
| Policy # | `{{POLICY_NUMBER}}` |
| Policy Type | Commercial UAS Liability + General Liability |
| Per-Occurrence Limit | $`{{LIMIT_PER_OCC}}` (default $1M; can endorse up to $5M) |
| Aggregate Limit | $`{{LIMIT_AGG}}` |
| Deductible | $`{{DEDUCTIBLE}}` |
| Effective Period | `{{POLICY_START}}` – `{{POLICY_END}}` |
| Renewal Lead Time | 30 days pre-expiry |
| Agent / Broker | `{{AGENT_NAME}}`, `{{AGENT_PHONE}}`, `{{AGENT_EMAIL}}` |
| Certificate Holder on File | Varies per engagement — COI issued on request |

## 6. Primary Remote PIC — Adam Pierce

| Field | Value |
|---|---|
| Name (as on cert) | `{{PIC_FULL_NAME}}` |
| FAA Part 107 Certificate # | `{{PIC_CERT}}` |
| Certificate Issued | `{{CERT_ISSUED}}` |
| Certificate Expiry | `{{CERT_EXPIRY}}` |
| Status | `{{STATUS}}` (Temporary — application #5303579, expires ~06/04/2026 / Permanent) |
| Recurrent Training Completion | `{{RECURRENT_DATE}}` (24-calendar-month rolling) |
| Additional Ratings / Endorsements | Night ops (107.29 general permissions post-rule); BVLOS / OOP as waivered |
| Supplementary Credentials | CISSP, CISA, U.S. Army veteran, `{{OTHER}}` |

## 7. Additional PICs (if hired / contracted)

| Name | Part 107 # | Expiry | Last Recurrent | Background Check | NDA on File |
|---|---|---|---|---|---|
| `{{NAME}}` | `{{CERT}}` | `{{EXP}}` | `{{DATE}}` | `{{Y/N}}` | `{{DATE}}` |

## 8. Aircraft Fleet

| Call Sign / SN | Make / Model | FAA Reg (FA-...) | Remote ID | Assigned PIC | Annual Inspection |
|---|---|---|---|---|---|
| `{{CALLSIGN}}` | `{{MAKE_MODEL}}` | `{{FA_NUMBER}}` | Built-in / Module SN | `{{PIC}}` | `{{DATE}}` |

## 9. Sensor Inventory

| Sensor ID | Model | Bands / Resolution | Last Calibration | Calibration Due |
|---|---|---|---|---|
| `{{SENSOR_1}}` | DJI `{{MODEL}}` RGB | | | |
| `{{SENSOR_2}}` | DJI M4T Thermal | 640×512, 8-14 μm LWIR | | |
| `{{SENSOR_N}}` | `{{MODEL}}` | | | |

## 10. Default Master Services Agreement

| Field | Value |
|---|---|
| MSA Template Version | `{{MSA_VERSION}}` (e.g., v2.1 — 2026) |
| MSA Template Location | `D:/Projects/faithandharmony/docs/contracts/msa-template.pdf` (or actual path) |
| Default Liability Cap | Fees paid for specific engagement |
| Default Payment Terms | Net 30 from invoice |
| Default Retention Period | 2 years commercial, 7 years insurance/legal/federal |
| Default Jurisdiction | Commonwealth of Virginia, Chesapeake / Hampton Roads |
| Default Dispute Resolution | Mediation → arbitration (AAA commercial rules) → litigation VA state court |

## 11. Business Contact & Brand

| Field | Value |
|---|---|
| Business Phone | (757) 843-8772 |
| Primary Email | info@sentinelaerialinspections.com |
| F&H Primary Email | info@faithandharmonyllc.com |
| Secure / Encrypted Channel | DoD SAFE + `{{PGP_KEY_FINGERPRINT}}` |
| Mailing Address | Hampton Roads, Virginia |
| FAA Cert Address (of record) | 4221 Quailshire Ct, Chesapeake VA 23321 |
| Website | sentinelaerialinspections.com |
| Parent Website | faithandharmonyllc.com |

## 12. Compliance & Framework References

| Framework | Current Posture |
|---|---|
| CMMC Level | `{{CMMC_LVL}}` (Level 1 self-attestation typical for basic federal work) |
| NIST 800-171 Controls | `{{IMPLEMENTATION_STATUS}}` |
| SOC 2 Type | `{{SOC2_STATUS}}` (evidence collection in progress via agent-office archive) |
| ISO 27001 (ISMS) | `{{ISO_STATUS}}` |
| ITAR Registration | `{{ITAR_STATUS}}` (required if foreign defense-related drone data — usually N/A) |

## 13. Useful Cross-References

- **Letterhead template**: `D:/Projects/faithandharmony/docs/report-templates/letterhead.html`
- **SAM.gov workspace**: https://sam.gov/workspace
- **FAA B4UFLY**: https://b4ufly.aloft.ai
- **Firmware / aircraft log location**: `{{PATH}}`
- **Insurance COI self-serve portal**: `{{URL}}`
- **SAI ops calendar**: `{{CALENDAR_LINK}}`

---

## How to use this file in reports

1. Every report references constants by the same placeholder name used here (e.g., `{{PIC_CERT}}`, `{{UEI}}`, `{{INSURANCE_CARRIER}}`).
2. When rendering a report:
   - Load this constants file
   - For each `{{PLACEHOLDER}}` in the report, substitute the value from this file
   - Flag any placeholder that resolves to `{{STILL_UNFILLED}}` for human review before delivery
3. Automation hook (future): a render script (`render.py` or similar) should refuse to output a PDF if critical placeholders (UEI for federal work, insurance for any work) are unfilled.

## Open items as of 2026-04-14

Fields still requiring canonical values (flagged for Adam to fill when known):

- `{{UEI}}` — pending SAM.gov issuance
- `{{CAGE}}` — issues with SAM activation
- `{{EIN}}` — redacted on external distribution, but needs canonical record here
- `{{INSURANCE_CARRIER}}`, `{{POLICY_NUMBER}}`, `{{POLICY_START/END}}`
- `{{SDVOSB_REF}}`, `{{VOSB_REF}}`, `{{SWAM_REF}}` — certification reference numbers
- `{{NAICS_PRIMARY}}` and secondary codes as registered on SAM.gov
- `{{AIRCRAFT_FLEET}}` — populate the inventory table (at minimum M4T + primary RGB aircraft)
- `{{PGP_KEY_FINGERPRINT}}` — if secure-comms channel established
- `{{PIC_CERT}}` — replace temporary cert with permanent cert when issued
