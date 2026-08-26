# SAI Constants — Single Source of Truth

> **Fill this out once.** Every report template pulls its boilerplate (business identifiers, insurance, PIC credentials, contract references) from this file. When a value changes (UEI issued, insurance renewed, cert renewed), update it here and every subsequent report inherits.
>
> **Last updated**: `2026-08-14` by `automated fill pass — pending Adam O. Pierce review`
> **Review cadence**: quarterly, or on any event below

---

## ⛔ NEEDS ADAM — this file is NOT ready to ship

**Everything below marked `{{PLACEHOLDER}}` is still unfilled and was left unfilled deliberately.** No identifier in this file was inferred, reconstructed, or filled from the template's own example text. A wrong UEI, CAGE, EIN, policy number, certificate number or expiry date on a federal deliverable is worse than a blank one, so where the vault had no authoritative value, the placeholder stays.

### Four blockers — the file cannot ship until these close

1. **🔴 Part 107 permanent certificate — `{{STATUS}}` in §6.** Two vault sources record the original issuance as a **temporary** airman certificate (application 5303579), and the file on disk is named `PierceAOTempCertFAA.pdf`. Nothing anywhere records receipt of the permanent certificate. If the temporary cert is still the only document on file, it lapsed **~2026-06-04**, which is a currency problem and not merely a paperwork one. This is a five-minute check in IACRA and it gates the entire template kit.

2. **🔴 Which insurance policy is in force — §5.** Ten daily briefings (2026-07-26 → 2026-08-11) name **41070392-01**. `projects/sentinel-aerial/Insurance Active.md` — the file an agent reaches for first — still names the superseded **41066191-00**, and the only COI on file (`agent-office/compliance/insurance/2026-04-15_skywatch_COI_ACZ04106619100.pdf`) is written against that old number. A fresh COI is almost certainly needed. The four questions assigned to compliance-audit-officer in April were never answered and **each one is a row in §5**: coverage period, per-occurrence vs aggregate, additional-insured endorsement policy, exclusions. **Term ends 2026-08-16.**

3. **🔴 The M4T sensor row has been deleted from §9 — do not restore it.** SAI does not own an M4T. `agent-office/sai-capabilities.md` §3 lists it under "Explicitly NOT in fleet (do not claim)". This file is the substitution source for every template, so a pre-filled M4T row injects an owned-thermal-sensor claim into every report that renders §9 — the exact failure the 2026-07-28 not-sellable quarantine exists to stop, and the same class as the M3E leak that reached `llms.txt` and an NSF SBIR pitch.

4. **🔴 The M4E's actual status — §8.** Briefings 2026-08-10 and 2026-08-11 both read *"M4E stranded at CAMRISE — legal escalation threshold crossed 8/4, no update on record."* Separately, the FAA serial-mismatch dispute opened 2026-06-15 (Camrise ticket 51987) has **no written resolution** in the vault. If SN `1581F7FVC251700C5813` and registration `FA3E4K3AEE` do not refer to the same airframe, neither may be printed. Until both close, §8 must not render on a client deliverable.

### Unresolved conflicts — sourced values exist but disagree

- **Registered agent (§1)** — the Operating Agreement §1.3 names Adam O. Pierce as registered agent, but `agent-office/finance/subscription-audit-2026-05-29.md` shows a recurring **ZenBusiness $99** charge categorised "Registered agent / compliance". If ZenBusiness is the agent of record at the VA SCC, the Operating Agreement is stale. **Left blank pending the live SCC record.**

### Unsourceable — no authoritative value exists anywhere in the vault

| Section | Placeholders | Why it matters |
|---|---|---|
| §4 NAICS | `{{NAICS_4}}`, `{{NAICS_5}}` | Only **three** codes are registered. The file's own examples (541922 / 541715) are illustrative text, not SAI's registration. Do not fill from them. `sai-capabilities.md` flags 481212 as `[NEED VERIFICATION]` — do not add it. |
| §5 Insurance | `{{LIMIT_AGG}}`, `{{DEDUCTIBLE}}`, `{{AGENT_NAME}}`, `{{AGENT_PHONE}}`, `{{AGENT_EMAIL}}` | Aggregate limit and deductible were open questions assigned in April and never answered. SkyWatch.AI is direct-to-consumer with no broker of record on file — if there is genuinely no broker, rewrite those three rows as "Direct — no broker" rather than leaving them blank. |
| §8 Fleet | `{{DATE}}` (annual inspection), Remote ID | No inspection log and no Remote ID serials recorded. |
| §9 Sensors | `{{SENSOR_1}}`, `{{MODEL}}`, `{{SENSOR_N}}`, all calibration dates | The M4E camera suite is not itemised at band/resolution level anywhere. **Do not infer it from spec sheets** — the standing drone-ops rule is never to assume hardware specs. No calibration record exists. The ~2026-06-10 IMU/gimbal/compass work was a **repair** recalibration and must not be entered as a sensor calibration certificate. |
| §10 MSA | `{{MSA_VERSION}}` | **No MSA exists.** The path this file cites (`docs/contracts/msa-template.pdf`) does not exist on disk — there is no `contracts/` directory. The other §10 rows are hardcoded terms of an agreement that has never been drafted. Flag for legal review before any of it is quoted to a client. |
| §11 Contact | `{{PGP_KEY_FINGERPRINT}}` | No PGP/GPG key exists. Either establish one or change the row to "DoD SAFE only" — a blank fingerprint beside "Secure / Encrypted Channel" reads as an omission. |
| §12 Compliance | `{{CMMC_LVL}}`, `{{IMPLEMENTATION_STATUS}}`, `{{SOC2_STATUS}}`, `{{ISO_STATUS}}`, `{{ITAR_STATUS}}` | **Highest-consequence blanks in the file.** A targeted search across `agent-office/compliance/`, `audit/` and `reports/` returns **zero** posture records. These appear on federal deliverables, and CMMC in particular is a self-attestation carrying False Claims Act exposure. **Leave every one blank.** If a solicitation demands them, that is a bd-contracts-officer task, not a fill-in. |
| §13 Cross-refs | `{{PATH}}`, `{{URL}}`, `{{CALENDAR_LINK}}` | AirData UAV is named as the flight-log system but no export path is recorded; no SkyWatch portal URL; no shareable ops calendar URL. |

### Two corrections owed to the vault, not to this file

- `projects/sentinel-aerial/Insurance Active.md` still names the superseded policy 41066191-00.
- `agent-office/sai-capabilities.md:46` still carries a stale `[NEED VERIFICATION]` on Mini 4 Pro ownership that the July registration and insurance confirmations closed.

---

## 1. Legal Entity

| Field | Value | Notes |
|---|---|---|
| Legal Name | Faith & Harmony LLC | |
| DBA | Sentinel Aerial Inspections | |
| Business Structure | Limited Liability Company (single-member) | |
| State of Formation | Virginia | |
| EIN | 61-2262355 | Redact on external distribution. Source: `sai-capabilities.md`, `swam-certification.md`. **Verify against the IRS CP575/147C before any federal filing.** |
| Formation Date | 2025-05-22 | VA SCC Entity ID 11851533, Filing 2505228644376. Source: `sai-company-info.md`, Operating Agreement §1.3 |
| Registered Agent | `{{AGENT}}` | ⛔ **Left blank — unresolved conflict.** Operating Agreement §1.3 says Adam O. Pierce; a recurring ZenBusiness $99 charge suggests ZenBusiness is the agent of record. Confirm against the live VA SCC record. |

## 2. Federal Contracting Identifiers

| Field | Value | Status / Expiry |
|---|---|---|
| UEI (SAM.gov) | JBPVN2EFN6S7 | Issued. Source: `sai-company-info.md`, `sam-registration-status.md`, `sai-capabilities.md` |
| CAGE Code | 20CX8 | DLA-assigned 2026-05-19. Same three sources |
| SAM.gov Registration Status | Active | Active since 2026-05-19. Source: `sam-registration-status.md` |
| SAM.gov Registration Expiry | 2027-05-06 | Annual renewal due 14:42:41 UTC. Source: `sam-registration-status.md` |
| DUNS (legacy, if referenced) | N/A — replaced by UEI April 2022 | |

> The former "⚠ PENDING as of 2026-04-14" annotations on UEI and CAGE were **stale**. Both were resolved 2026-05-19 and the annotations have been corrected, not merely the values.

## 3. Small-Business Certifications

> **Nothing in this table is held.** Every row is an application, an unverified eligibility, or nothing at all. On federal deliverables, suppress a row entirely rather than printing a status — a reader parses the row's presence as an eligibility claim.

| Certification | Status | Cert # / Ref | Expiry |
|---|---|---|---|
| SDVOSB (SBA VetCert) | Application submitted — none issued | None issued. MySBA application 109072 is an application number, NOT a cert number | N/A — none held |
| VOSB (VA Vets First) | None held. Same MySBA VetCert application covers VOSB/SDVOSB | None issued | N/A — none held |
| VA SWaM (Small, Women-, Minority-Owned) | In review — none issued. Submitted 2026-06-02, resubmitted 06-04, officer assigned 06-10, no decision as of 2026-08-01 | #845700 — application in review, NOT a cert number | N/A — none held |
| HUBZone | None held; address eligibility never verified | Check address eligibility annually | |
| 8(a) Business Development | Not pursued; none held | | |

> **The parenthetical on the SDVOSB row was corrected.** It previously described the credential as an SBA self-certification. That route to SDVOSB set-aside eligibility was eliminated effective 2024-01-01 — VetCert is the only route — so the old label named a category that no longer exists, on top of asserting a status Adam does not hold. This file is the substitution source all reports inherit, so a false status here re-seeds into every deliverable. The superseded wording is deliberately not reproduced anywhere in this file.

> ⚠️ **Two time-boxed risks.** (a) SBA VetCert draft **109072 expires ~2026-09-12**, and `vetcert-sdvosb.md` warns the dashboard card tags the draft "HUBZone" — **verify Program Selection includes VOSB/SDVOSB before signing**, or the whole application is wasted. (b) SWaM **#845700** has had no movement since the 2026-08-01 check. `swam-certification.md` explicitly warns that every "expected approval" date elsewhere in the vault is derived arithmetic, never SBSD-confirmed — **do not put a date on it.**

## 4. NAICS Codes

| NAICS | Description | Primary? |
|---|---|---|
| 541370 | Surveying and Mapping (except Geophysical) Services | Primary — code is confirmed; the *primary* flag is inferred from list order, confirm on SAM.gov |
| 541990 | All Other Professional, Scientific, and Technical Services | |
| 561621 | Security Systems Services | |
| `{{NAICS_4}}` | ⛔ Only three codes are registered — see NEEDS ADAM | |
| `{{NAICS_5}}` | ⛔ Only three codes are registered — see NEEDS ADAM | |

> `service-lines/Corrections Fence Inspection.md` *recommends* registering 481219, 561612, 922140 and 561210. That is a recommendation, not a registration. Do not add them here.

## 5. Insurance (Aviation & General Liability)

| Field | Value |
|---|---|
| Carrier | SkyWatch.AI |
| Policy # | 41070392-01 — ⚠ **10 briefings agree, but `Insurance Active.md` still names the superseded 41066191-00 and the COI on file is against that old number. Confirm before printing.** |
| Policy Type | Commercial UAS Liability + General Liability |
| Per-Occurrence Limit | $1,000,000 — ⚠ **this figure originated in a grant narrative, not the policy. Read `S1/Finance/monthly-package/2026-04/insurance/*_policy_*.pdf` before printing it.** |
| Aggregate Limit | $`{{LIMIT_AGG}}` — ⛔ never answered, see NEEDS ADAM |
| Deductible | $`{{DEDUCTIBLE}}` — ⛔ not recorded anywhere; M4E hull value is $6,000 |
| Effective Period | 2026-07-16 – 2026-08-16 (auto-renews monthly on the 16th, $120/mo on MC ending 6128) |
| Renewal Lead Time | 30 days pre-expiry |
| Agent / Broker | `{{AGENT_NAME}}`, `{{AGENT_PHONE}}`, `{{AGENT_EMAIL}}` — ⛔ SkyWatch.AI is direct-to-consumer; if there is no broker, rewrite this row as "Direct — no broker" |
| Certificate Holder on File | Varies per engagement — COI issued on request |

> 🔴 **Renewal is auto, but it is auto on one specific card.** A declined MC-6128 on a Sunday and the COI on a federal deliverable is void.

## 6. Primary Remote PIC — Adam Pierce

| Field | Value |
|---|---|
| Name (as on cert) | Adam Orlando Pierce — string not directly verified against the cert image; `vetcert-sdvosb.md` records a VA↔SBA name-match gotcha on this exact string |
| FAA Part 107 Certificate # | 5275329 |
| Certificate Issued | 2026-02-04 |
| Recurrent currency due | Part 107 remote pilot certificates **do not expire**. Currency is maintained by 24-calendar-month recurrent training — see the row below |
| Status | `{{STATUS}}` — ⛔ **BLOCKER 1. Do not fill.** See NEEDS ADAM |
| Recurrent Training Completion | None completed — not yet due. Initial knowledge test 2026-02-04, currency runs to the end of the 24th calendar month |
| Additional Ratings / Endorsements | Night ops (107.29 general permissions post-rule); BVLOS / OOP as waivered — **SAI holds neither a 107.31 nor a 107.39 waiver** |
| Supplementary Credentials | CISSP, CISA, U.S. Army veteran, CompTIA Security+ / Network+ / Linux+, DBA Information Systems Mgmt (Walden 2016), MBA 2011, MS Networking & Comms Mgmt — Security (2009) |

> 🔴 **Known poisoning event on `{{PIC_CERT}}`.** `SAI-Report-Template.html` in the vault root carries a DEMO placeholder **#4812346**, and it propagated into the report spec. The standing gate in `.claude/session-handoff.md` is: *verify 5275329 before any asset ships.* **If §6 ever renders 4812346, the source was the demo template.**

> The row formerly labelled "Certificate Expiry" was relabelled "Recurrent currency due". A Part 107 certificate has no expiry, and an expiry-shaped row invites someone to write a date that does not exist.

## 7. Additional PICs (if hired / contracted)

| Name | Part 107 # | Expiry | Last Recurrent | Background Check | NDA on File |
|---|---|---|---|---|---|
| N/A — single Remote PIC | N/A | N/A | N/A | N/A | N/A |

> **Sole-operator company.** Adam is 100% owner and the only pilot; `swam-certification.md` documents a signed no-employees letter filed as the Form 941 substitute. This row is explicitly N/A so a reader cannot mistake a blank table for an unfilled one.

## 8. Aircraft Fleet

> ⛔ **BLOCKER 4 — this section must not render on a client deliverable yet.** The M4E is recorded as stranded at CAMRISE, and the FAA serial-mismatch dispute is unresolved in writing. Listing an airframe SAI cannot fly is a misrepresentation; printing a registration that may not belong to the recorded serial is worse. Values are captured here as the internal record of what the vault says, not as approved-to-print.

| Call Sign / SN | Make / Model | FAA Reg (FA-...) | Remote ID | Assigned PIC | Annual Inspection |
|---|---|---|---|---|---|
| M4E — SN 1581F7FVC251700C5813 | DJI Matrice 4E | FA3E4K3AEE (issued 2026-03-14, expires 2029-03-14) | `{{REMOTE_ID}}` ⛔ | Adam O. Pierce | `{{DATE}}` ⛔ |
| MINI1 | DJI Mini 4 Pro | FA37KRNLXM | `{{REMOTE_ID}}` ⛔ | Adam O. Pierce | `{{DATE}}` ⛔ |

## 9. Sensor Inventory

> ⛔ **The pre-filled "DJI M4T Thermal, 640×512, 8-14 μm LWIR" row has been DELETED — BLOCKER 3. Do not restore it.** SAI does not own an M4T; it is listed under "To acquire (~$5,500)". This file is the substitution source for every template and four service-line templates are thermal-first, so that one row was an owned-thermal-sensor claim waiting to be inherited by any report rendering §9.

| Sensor ID | Model | Bands / Resolution | Last Calibration | Calibration Due |
|---|---|---|---|---|
| `{{SENSOR_1}}` ⛔ | DJI Matrice 4E RGB — `{{MODEL}}` ⛔ | ⛔ not itemised in any vault source | ⛔ no record | ⛔ no record |
| `{{SENSOR_N}}` ⛔ | DJI Mini 4 Pro camera — `{{MODEL}}` ⛔ | ⛔ not itemised in any vault source | ⛔ no record | ⛔ no record |

> **Do not infer these from manufacturer spec sheets.** The standing drone-ops rule is to pull authoritative platform data or state explicitly that a value is an unverified estimate. Note also that the ~2026-06-10 IMU / gimbal / compass work on the M4E was a **repair** recalibration on return from service — it is not a sensor calibration certificate and must not be entered as one.

## 10. Default Master Services Agreement

| Field | Value |
|---|---|
| MSA Template Version | `{{MSA_VERSION}}` — ⛔ **no MSA exists.** The path below does not exist on disk |
| MSA Template Location | ⛔ `docs/contracts/msa-template.pdf` **does not exist** — there is no `contracts/` directory |
| Default Liability Cap | Fees paid for specific engagement |
| Default Payment Terms | Net 30 from invoice |
| Default Retention Period | 2 years commercial, 7 years insurance/legal/federal |
| Default Jurisdiction | Commonwealth of Virginia, Chesapeake / Hampton Roads |
| Default Dispute Resolution | Mediation → arbitration (AAA commercial rules) → litigation VA state court |

> The five rows above are hardcoded, not placeholders — but they describe terms of an agreement **that has never been drafted**. Do not quote any of them to a client before legal review.

## 11. Business Contact & Brand

| Field | Value |
|---|---|
| Business Phone | (757) 843-8772 |
| Primary Email | info@sentinelaerialinspections.com |
| F&H Primary Email | info@faithandharmonyllc.com |
| PI Direct Email | draopierce@faithandharmonyllc.com (preferred business address since 2026-06-03) |
| Secure / Encrypted Channel | DoD SAFE + `{{PGP_KEY_FINGERPRINT}}` — ⛔ **no PGP key exists.** Establish one or change this row to "DoD SAFE only" |
| Mailing Address | Hampton Roads, Virginia |
| FAA Cert Address (of record) | 4221 Quailshire Ct, Chesapeake VA 23321-3196 |
| Website | sentinelaerialinspections.com |
| Parent Website | faithandharmonyllc.com |

## 12. Compliance & Framework References

> ⛔ **All five rows are unsourceable and every one is left blank deliberately.** A search across `agent-office/compliance/`, `agent-office/audit/` and `agent-office/reports/` returns **zero** posture records. The `ciso-officer` and `compliance-audit-officer` agents own ISMS and SOC 2 evidence on paper, but no evidence artifacts have been produced. These rows appear on federal deliverables and CMMC is a self-attestation carrying False Claims Act exposure. **If a solicitation demands them, route it to bd-contracts-officer — this is not a fill-in.**

| Framework | Current Posture |
|---|---|
| CMMC Level | `{{CMMC_LVL}}` ⛔ |
| NIST 800-171 Controls | `{{IMPLEMENTATION_STATUS}}` ⛔ |
| SOC 2 Type | `{{SOC2_STATUS}}` ⛔ — the old hint here claimed "evidence collection in progress via agent-office archive"; that archive contains no SOC 2 evidence |
| ISO 27001 (ISMS) | `{{ISO_STATUS}}` ⛔ |
| ITAR Registration | `{{ITAR_STATUS}}` ⛔ — likely "Not registered / N/A", but that is an inference and is not written down anywhere |

## 13. Useful Cross-References

- **Letterhead template**: `D:/Projects/FaithandHarmony/docs/report-templates/letterhead.html`
- **SAM.gov workspace**: https://sam.gov/workspace
- **FAA B4UFLY**: https://b4ufly.aloft.ai
- **Firmware / aircraft log location**: `{{PATH}}` ⛔ AirData UAV is named as the flight-log system but no export path is recorded
- **Insurance COI self-serve portal**: `{{URL}}` ⛔ no portal URL recorded. The only COI on file is a static PDF at `agent-office/compliance/insurance/2026-04-15_skywatch_COI_ACZ04106619100.pdf` — **and it is against the superseded policy 41066191-00**
- **SAI ops calendar**: `{{CALENDAR_LINK}}` ⛔ Google Calendar is wired into office automation but no shareable URL is recorded

---

## How to use this file in reports

1. Every report references constants by the same placeholder name used here (e.g., `{{PIC_CERT}}`, `{{UEI}}`, `{{INSURANCE_CARRIER}}`).
2. When rendering a report:
   - Load this constants file
   - For each `{{PLACEHOLDER}}` in the report, substitute the value from this file
   - Flag any placeholder that resolves to `{{STILL_UNFILLED}}` for human review before delivery
3. Automation hook (future): a render script (`render.py` or similar) should refuse to output a PDF if critical placeholders (UEI for federal work, insurance for any work) are unfilled.
4. **Refusal beats a guess.** A field that cannot be filled is refused with a stated reason. Every `⛔` above is a deliberate refusal, not an oversight — do not "helpfully" complete one from a spec sheet, an example value, or arithmetic.

## Open items as of 2026-08-14

Superseded values now closed: `{{UEI}}`, `{{CAGE}}` (both issued 2026-05-19), `{{EIN}}`, `{{INSURANCE_CARRIER}}`, `{{POLICY_START}}`/`{{POLICY_END}}`, `{{NAICS_PRIMARY}}` and secondaries, `{{FORMATION_DATE}}`, `{{PIC_FULL_NAME}}`, `{{PIC_CERT}}`, `{{CERT_ISSUED}}`, `{{OTHER}}`, §7 (sole operator).

Still outstanding — see the **NEEDS ADAM** block at the top of this file for why each one matters:

- `{{STATUS}}` — Part 107 permanent certificate vs lapsed temporary (blocker)
- `{{POLICY_NUMBER}}` conflict, `{{LIMIT_AGG}}`, `{{DEDUCTIBLE}}`, broker rows (blocker)
- §8 M4E possession + FAA serial-mismatch dispute, `{{REMOTE_ID}}`, inspection dates (blocker)
- §9 sensor itemisation and calibration records — **and the M4T row stays deleted** (blocker)
- `{{AGENT}}` — registered agent of record, Operating Agreement vs ZenBusiness
- `{{NAICS_4}}`, `{{NAICS_5}}` — only three codes registered
- `{{MSA_VERSION}}` — no MSA has ever been drafted
- `{{PGP_KEY_FINGERPRINT}}` — no key exists
- `{{CMMC_LVL}}`, `{{IMPLEMENTATION_STATUS}}`, `{{SOC2_STATUS}}`, `{{ISO_STATUS}}`, `{{ITAR_STATUS}}` — zero posture records
- `{{PATH}}`, `{{URL}}`, `{{CALENDAR_LINK}}`
