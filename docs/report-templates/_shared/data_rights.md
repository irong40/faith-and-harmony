# Data Rights, Metadata & Delivery Block

> **Purpose**: Required for federal contracts (SBIR, GSA, agency task orders), SDVOSB set-asides, and any deliverable governed by FAR/DFARS clauses. Strongly recommended for commercial deliverables to clarify licensing. Delete sections that don't apply.

---

## A. Data Rights (Federal Contracts)

### For FAR-based contracts (civilian agencies)

Pursuant to **FAR 52.227-14** (Rights in Data — General), Sentinel Aerial Inspections asserts the following categories:

| Category | Data Covered | Notes |
|---|---|---|
| Limited Rights Data | `{{LIMITED_RIGHTS_LIST}}` | Developed at private expense — legend below |
| Unlimited Rights Data | `{{UNLIMITED_RIGHTS_LIST}}` | Delivered with Government unlimited rights |
| Restricted Rights Software | `{{RESTRICTED_SW_LIST}}` | If any proprietary software delivered |

**Limited Rights Legend** (affix to each limited-rights file):

> LIMITED RIGHTS
> Contract No.: `{{CONTRACT_NO}}`
> Contractor Name: Faith & Harmony LLC dba Sentinel Aerial Inspections
> Contractor Address: Hampton Roads, Virginia
> Expiration Date: `{{EXPIRATION}}` (or "None" if no expiration)
> The Government's rights to use, modify, reproduce, release, perform, display, or disclose these technical data are restricted by paragraph (b)(3) of the Rights in Data—General clause contained in the above identified contract.

### For DFARS-based contracts (DoD)

Pursuant to **DFARS 252.227-7013** (Rights in Technical Data — Noncommercial Items) and **252.227-7014** (Rights in Noncommercial Computer Software):

| Category | Basis | Files |
|---|---|---|
| Government Purpose Rights | Mixed funding — `{{NEGOTIATED_PERIOD}}` year period | `{{FILE_LIST}}` |
| Limited Rights | Developed exclusively at private expense | `{{FILE_LIST}}` |
| Unlimited Rights | Developed exclusively with Government funds | `{{FILE_LIST}}` |

Required legends applied to all deliverable files per DFARS 252.227-7013(f).

## B. Commercial License Grant (non-federal contracts)

Under the Sentinel Aerial Inspections Master Services Agreement dated `{{MSA_DATE}}`:

- **Client receives** a perpetual, non-exclusive, royalty-free license to use, reproduce, and display the deliverables for the client's internal business purposes, including marketing the specific subject property and submission to carriers, regulatory bodies, or courts as required.
- **SAI retains** copyright in all raw imagery and derivative works, and reserves the right to use anonymized, non-identifiable portions of the deliverables for portfolio, marketing, and training purposes unless a confidentiality clause prohibits such use.
- **Third-party licensing** (sublicensing, resale, redistribution) requires prior written consent from SAI.
- Exclusions or modifications to this default grant are documented in the engagement Statement of Work.

## C. Metadata Standards

### FGDC CSDGM (federal geospatial deliverables)

Accompanying XML metadata file `{{METADATA_XML}}` is written to the FGDC Content Standard for Digital Geospatial Metadata (CSDGM), Version 2, FGDC-STD-001-1998 schema. Validator output from `{{VALIDATOR_TOOL}}` is attached at `{{VALIDATION_LOG}}`; acceptance of the metadata record is the receiving agency's determination.

> **Gate.** Include §C only when the XML is present in the delivery folder **and** a validator log with zero errors is attached. Sortie writes no FGDC or ISO metadata today, so until it does, delete §C per this file's header instruction rather than shipping a claim about a file that does not exist.

### ISO 19115 / 19139 (international / newer federal)

Alternative metadata provided per ISO 19115-1:2014 with ISO 19139-1:2019 XML encoding: `{{ISO_METADATA_XML}}`.

### EXIF / XMP (imagery)

All imagery retains original EXIF/XMP tags including:
- Capture timestamp (UTC + local)
- GPS coordinates (WGS84)
- Aircraft make/model
- Sensor model, focal length, ISO, shutter, aperture
- Gimbal pitch/roll/yaw
- Relative altitude

No EXIF fields have been stripped or modified.

## D. Accessibility (Section 508)

For federal deliverables, the final report PDF conforms to:

- **Section 508 Standards**, 36 CFR Part 1194 (2017 Revised 508 Standards)
- **WCAG 2.1 Level AA** — text alternatives for all images, logical reading order, tagged PDF structure
- **PDF/UA-1** compliance verified via `{{TOOL}}` (e.g., PAC 2024, Adobe Acrobat Pro Accessibility Checker)

## E. Delivery Manifest

| Deliverable | Format | Size | Hash (SHA-256) | Delivery Medium |
|---|---|---|---|---|
| Final Report | PDF (PDF/A-2b) | `{{SIZE}}` | `{{HASH}}` | `{{MEDIUM}}` |
| Orthomosaic | GeoTIFF (LZW, cloud-optimized) | `{{SIZE}}` | `{{HASH}}` | |
| DSM | GeoTIFF (32-bit float) | `{{SIZE}}` | `{{HASH}}` | |
| DTM | GeoTIFF (if requested) | `{{SIZE}}` | `{{HASH}}` | |
| Point Cloud | LAS 1.4 / LAZ | `{{SIZE}}` | `{{HASH}}` | |
| 3D Mesh | OBJ + MTL / 3D Tiles | `{{SIZE}}` | `{{HASH}}` | |
| Raw Imagery (if contracted) | DNG / JPEG / R-JPEG | `{{SIZE}}` | `{{HASH}}` | |
| Flight Logs | CSV + KML | `{{SIZE}}` | `{{HASH}}` | |
| Metadata | XML (FGDC / ISO) | `{{SIZE}}` | `{{HASH}}` | |

**Primary delivery channel**: `{{DELIVERY}}` (encrypted SFTP / DoD SAFE / client-approved cloud portal)
**Secondary (physical)**: `{{MEDIUM}}` with tamper-evident seal, tracked shipment

## F. Required Contract References

| Contract Clause / Reference | Applicable? | Citation in Deliverable |
|---|---|---|
| FAR 52.227-14 (Rights in Data) | {{Y/N}} | Section A |
| DFARS 252.227-7013 / -7014 | {{Y/N}} | Section A |
| FAR 52.204-21 (Basic Safeguarding) | {{Y/N}} | Controls in effect |
| DFARS 252.204-7012 (CUI) | {{Y/N}} | CMMC Level `{{LVL}}` |
| Section 508 / WCAG 2.1 AA | {{Y/N}} | Section D |
| Buy American Act | {{Y/N}} | Offeror certification submitted with the offer — see `{{BAA_CERT_REF}}` |

---

*Company identifiers for federal work: CAGE Code `{{CAGE}}` · UEI `{{UEI_OR_PENDING}}` · NAICS `{{NAICS}}` · SDVOSB: `{{SDVOSB_STATUS}}` (SBA VetCert).*
