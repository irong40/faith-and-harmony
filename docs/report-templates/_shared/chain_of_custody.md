# Chain of Custody — Evidence & Media Log

> **Purpose**: Required for insurance-claim-grade, legal-grade, SAR, and corrections reports. Establishes unbroken custody of digital evidence from capture through delivery. For standard commercial work, this appendix is optional but recommended.

---

## A. Media Capture Manifest

| Sortie # | Aircraft SN | Sensor | Card/Media SN | Start Time (UTC) | End Time (UTC) | # Files | Raw File Hash Manifest |
|---|---|---|---|---|---|---|---|
| 1 | {{SN}} | {{SENSOR}} | {{CARD_SN}} | {{UTC_START}} | {{UTC_END}} | {{COUNT}} | `{{SHA256_MANIFEST}}` |
| 2 | | | | | | | |

## B. Custody Transfer Log

Each transfer of the raw media — from SD card through processing — is logged here. A transfer is any change of physical or logical custody (card removal, upload, copy, offsite backup, delivery to client).

| # | Date/Time (UTC) | Action | From Custodian | To Custodian | Medium | Hash Verified? | Notes |
|---|---|---|---|---|---|---|---|
| 1 | {{TS}} | Card removed from aircraft | N/A | {{PIC_NAME}} | MicroSD `{{SN}}` | — | Seal tag {{TAG_ID}} applied |
| 2 | {{TS}} | Card to workstation (ingest) | {{PIC_NAME}} | {{INGEST_STATION}} | USB 3.0 reader | YES / NO | Ingest log ref `{{REF}}` |
| 3 | {{TS}} | Primary archive write | {{INGEST_STATION}} | {{ARCHIVE_SYSTEM}} | NAS / SHA-256 | YES | Hash = `{{HASH}}` |
| 4 | {{TS}} | Offsite backup | {{ARCHIVE}} | {{CLOUD_PROVIDER}} | Encrypted upload | YES | Versioned, immutable |
| 5 | {{TS}} | Delivery to Client | {{SAI_POC}} | {{CLIENT_POC}} | {{DELIVERY_METHOD}} | YES | Hash provided with delivery |

## C. Hash Manifest (SHA-256)

Raw media hashes are computed at ingest and verified at every custody transfer. A separate `manifest.sha256` file accompanies the raw archive.

**Manifest location**: `{{ARCHIVE_PATH}}/manifest.sha256`
**Manifest created**: `{{MANIFEST_CREATED_UTC}}` by `{{TOOL}}` (e.g., `sha256sum`, `Get-FileHash`)
**Manifest verification command**:

```
sha256sum -c manifest.sha256
```

**Sample entries** (first/last 3 for this engagement):

```
{{HASH_1}}  DJI_0001.DNG
{{HASH_2}}  DJI_0002.DNG
{{HASH_3}}  DJI_0003.DNG
...
{{HASH_N-2}}  DJI_{{NUM-2}}.DNG
{{HASH_N-1}}  DJI_{{NUM-1}}.DNG
{{HASH_N}}    DJI_{{NUM}}.DNG
```

## D. Derivative Work Log

Any processed outputs (orthomosaics, annotated imagery, stitched panoramas, thermal overlays) are derivatives. This log links each derivative to its source files.

| Derivative File | Source File(s) | Processing Tool & Version | Operator | Date/Time (UTC) | Output Hash |
|---|---|---|---|---|---|
| `ortho_final.tif` | DJI_0001-0247 | WebODM 2.5.3 / GPU profile | {{OPERATOR}} | {{UTC}} | {{HASH}} |
| `anomaly_map.pdf` | thermal_001-089 | DJI Thermal Analysis Tool 3.x | {{OPERATOR}} | {{UTC}} | {{HASH}} |

## E. Access Log

Any individual other than the operator who views or handles the raw/derivative media before client delivery is logged here.

| Date/Time (UTC) | Individual | Role | Reason for Access | Files Accessed |
|---|---|---|---|---|
| — | — | — | — | — |

## F. Chain of Custody Statement

I have personal knowledge of the matters stated herein. The custody log above records every transfer of the described digital evidence known to me, and I am aware of no gaps, substitutions, or modifications to the raw media outside the entries documented. Entries marked "not recorded" are gaps in this log and must not be read as evidence that no transfer occurred.

**Custodian of Record:** `{{CUSTODIAN_NAME}}`, `{{CUSTODIAN_TITLE}}`
**Signature:** ____________________________ **Date:** `{{DATE}}`

---

*For corrections-facility or criminal-matter evidence, an additional witnessed seal/unseal log is appended at custody transfers.*
