# SAI Report Templates

Client-facing deliverable report templates for Sentinel Aerial Inspections (a DBA of Faith & Harmony LLC). These replace bare-bones output with professional, government/insurance/legal-grade documentation.

---

## Directory layout

```
report-templates/
├── letterhead.html                  SAI-branded HTML wrapper for PDF rendering
├── assets/
│   └── sai-logo.png                 Brand logo embedded in letterhead
├── _shared/                         Reusable components — include in every template
│   ├── _sai_constants.md            ⭐ Fill once. Single source of truth for UEI,
│   │                                  CAGE, insurance, PIC cert, NAICS, etc.
│   ├── header_metadata.md           Universal flight/mission metadata block
│   ├── compliance_attestation.md    Part 107 + airspace + PIC signature
│   ├── chain_of_custody.md          Evidence custody log (SHA-256 hashes)
│   ├── accuracy_statement.md        RMSE/GSD/CEP90 + ASPRS accuracy class
│   ├── data_rights.md               FAR/DFARS, license grant, metadata, 508
│   └── limitations_disclaimers.md   Liability + service-line-specific carve-outs
│
├── wildlife-census.md               Deer, geese, waterfowl, livestock counts
├── insurance-damage.md              Post-event claim documentation (HAAG-aligned)
├── land-survey-ortho.md             Photogrammetric mapping (ASPRS-compliant)
├── roof-inspection.md               Non-claim roof condition assessment
├── solar-thermal.md                 PV array IR inspection (IEC 62446-3)
├── construction-progress.md         Recurring weekly/bi-weekly site reports
├── real-estate-aerial.md            Marketing deliverable package + license
├── corrections-fence.md             Perimeter inspection (CUI-marked)
└── sar-thermal.md                   Search-and-rescue after-action report
```

---

## How a report gets built

**Before the first report ever ships**, fill in `_shared/_sai_constants.md` — that file is the single source of truth for every value that doesn't change per engagement (UEI, CAGE, insurance, PIC cert, NAICS, aircraft fleet, MSA defaults). Every placeholder in every template named the same as a constant resolves to the value in that file. When insurance renews or the UEI is issued, update `_sai_constants.md` once and all subsequent reports inherit.

1. **Pick the service-line template** that matches the engagement (e.g., `wildlife-census.md`).
2. **Fill in every `{{PLACEHOLDER}}`** — constants are pulled from `_sai_constants.md`, engagement-specific fields are filled by hand. If a field is truly not applicable, write "N/A — [reason]" rather than leaving it blank.
3. **Include the shared blocks** the template references by name:
   - All reports: `header_metadata.md`, `compliance_attestation.md`, `limitations_disclaimers.md`
   - Mapping / measurements: add `accuracy_statement.md`
   - Insurance / corrections / SAR / federal: add `chain_of_custody.md`
   - Federal contracts: add `data_rights.md`
4. **Render to PDF**:
   - Paste the finished markdown content into the `{{CONTENT}}` slot of `letterhead.html`
   - Fill in the letterhead header placeholders (`{{DOCUMENT_TYPE}}`, `{{DOCUMENT_TITLE}}`, `{{REPORT_ID}}`, etc.)
   - Open in Chrome / Edge, Print → Save as PDF (Letter, margins per @page rule)
   - Or: use Pandoc / Weasyprint for automated pipeline
5. **Hash the final PDF** (SHA-256) and add the hash to the delivery manifest.
6. **Deliver** via the channel matching the classification (SFTP for CUI, portal for standard, DoD SAFE for federal-restricted).

---

## Report ID convention

`SAI-YYYYMMDD-NNN` — first flight date + zero-padded sequential (starts at 001 per day). Example: `SAI-20260414-001`.

Report versions append `-v1.0`, `-v1.1-revised`, etc.

---

## Classification markings

| Level | Use When | Header Marking | Delivery |
|---|---|---|---|
| UNCLASSIFIED / PROPRIETARY | Standard commercial work | none required | email/portal |
| CUI — PRVCY | Contains PII (insured name, medical, minors) | CUI banner, distribute list | encrypted channel |
| CUI — LEI | Law enforcement / secure facility infrastructure | CUI banner + limited distribution | DoD SAFE / SFTP |
| CUI — SP-CRIT | Critical infrastructure security-sensitive | CUI banner + need-to-know | DoD SAFE, no cloud |

The `corrections-fence.md` template ships with the banner enabled. For any other report requiring CUI, un-comment the banner in `letterhead.html`.

---

## Service-line quick-reference

| Service | Template | Shared Blocks Required | Delivery Tier |
|---|---|---|---|
| Wildlife census | `wildlife-census.md` | metadata + attestation + accuracy + custody + limitations | Research / Gov / Commercial |
| Insurance damage | `insurance-damage.md` | metadata + attestation + custody + limitations | Insurance-grade / Legal-capable |
| Mapping / survey | `land-survey-ortho.md` | metadata + attestation + accuracy + (custody if federal) + (data rights if federal) + limitations | Commercial / Federal |
| Roof inspection | `roof-inspection.md` | metadata + attestation + accuracy + limitations | Commercial |
| Solar thermal | `solar-thermal.md` | metadata + attestation + accuracy + limitations | Commercial / O&M |
| Construction progress | `construction-progress.md` | metadata + attestation + accuracy + limitations | Commercial |
| Real estate | `real-estate-aerial.md` | metadata + attestation + limitations | Marketing |
| Corrections fence | `corrections-fence.md` | metadata + attestation + accuracy + custody + data rights + limitations | Gov / CUI |
| SAR thermal | `sar-thermal.md` | metadata + attestation + accuracy + custody + limitations | Public-safety / Evidentiary |

---

## Quality bar (before any report ships)

A report is ready to deliver when all of these are true:

- [ ] `_sai_constants.md` has no `{{STILL_UNFILLED}}` values for any constant this report references
- [ ] Every `{{PLACEHOLDER}}` in the template is filled or marked "N/A"
- [ ] Universal metadata header is complete
- [ ] PIC signature block is signed & dated
- [ ] All figure references (`Fig X.Y`) resolve to an actual figure in the report or appendices
- [ ] Accuracy statement matches the deliverables (don't ship mapping product without RMSE)
- [ ] Chain of custody is present for insurance/corrections/SAR/federal work
- [ ] Limitations section has engagement-specific items listed (§C), not just boilerplate
- [ ] Classification banner matches the delivery channel
- [ ] Final PDF hashed, hash recorded in delivery manifest
- [ ] Report reviewed by a second SAI team member (dual-sign where contracted)

---

## Update policy

- **Breaking changes** to shared components (`_shared/*.md`) require a version bump and notification to any in-flight engagements — existing reports keep their original block; new reports pick up the new version.
- **Template updates**: changelog entries dated + brief reason.
- **Standards drift**: review annually against ASPRS, ASTM, IEC, and FAA publications. Last review: 2026-04-14.

---

## Changelog

| Date | Change | Author |
|---|---|---|
| 2026-04-14 | Initial build — 9 templates + 6 shared components + SAI letterhead | COO |
| 2026-04-14 | Added `_sai_constants.md` single-source-of-truth file | COO |

---

*Point of contact: info@sentinelaerialinspections.com. For template questions or custom variants (dual-sign PE-stamped, notarized insurance, foreign-language), contact the SAI office.*
