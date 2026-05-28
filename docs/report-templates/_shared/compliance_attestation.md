# Compliance & PIC Attestation Block

> **Purpose**: Required at the end of every SAI report. Signed and dated by the Remote PIC. Establishes regulatory compliance, methodology integrity, and accountability.

---

## Regulatory Compliance Statement

All flight operations documented in this report were conducted in accordance with:

- **14 CFR Part 107** — Small Unmanned Aircraft Systems
- **FAA Remote ID Rule** (14 CFR Part 89) — Broadcast compliance verified pre-flight
- **Airspace authorization** — Operations conducted in `{{AIRSPACE_CLASS}}` airspace under `{{LAANC_ID_OR_N/A}}`
- **Applicable Waivers** — `{{WAIVER_LIST_OR_NONE}}`
- **State & local ordinances** — Verified for `{{COUNTY}}`, `{{STATE}}`
- **Site-specific requirements** — `{{SITE_REQUIREMENTS_OR_NONE}}` (e.g., facility SOP, OSHA, HIPAA if medical facility)

No operations were conducted over non-participating persons without a Part 107.39 waiver or Category 1/2/3 compliant sUAS. No operations were conducted beyond visual line of sight (BVLOS) without Part 107.31 waiver.

## Methodology Statement

The data collection methodology described in this report follows industry-accepted practices for `{{SERVICE_LINE}}`. Key references:

- `{{REFERENCE_1}}` (e.g., ASPRS Positional Accuracy Standards for Digital Geospatial Data, 2014)
- `{{REFERENCE_2}}` (e.g., ASTM E2128 for roof condition assessment)
- `{{REFERENCE_3}}` (e.g., peer-reviewed thermal census protocol)

Deviations from standard methodology, if any, are documented in the Limitations section of this report.

## Data Integrity Statement

- All imagery, sensor data, and flight logs referenced in this report were captured during the flight operations described
- No imagery has been manipulated beyond standard non-destructive processing (white-balance, exposure, lens correction, orthorectification)
- Raw media files are archived at SAI under file hash manifest `{{HASH_MANIFEST_REF}}` (SHA-256 — see Chain of Custody appendix)
- Retention: raw media retained for `{{RETENTION_PERIOD}}` (default: 7 years for insurance/legal-grade; 2 years for standard commercial)

## Remote Pilot-in-Command Attestation

I, the undersigned Remote Pilot-in-Command, attest that:

1. I hold a current FAA Part 107 Remote Pilot Certificate, number `{{PIC_CERT_NUMBER}}`, valid through `{{PIC_EXPIRY}}`.
2. I conducted or directly supervised all flight operations described in this report.
3. A pre-flight inspection of aircraft, control link, and payload was completed before each sortie per 14 CFR 107.49.
4. All observations, measurements, and findings in this report are true and accurate to the best of my professional knowledge.
5. No conflict of interest exists between myself, Sentinel Aerial Inspections, and the subject matter of this report, except as disclosed in writing to the client.

**Signed:**

<table style="width:100%; border:none;">
<tr>
<td style="width:50%; border:none; padding-right: 20px;">
<div style="border-bottom: 1px solid #000; height: 40px;"></div>
<div style="font-size: 9pt; color: #64607a;">Remote Pilot-in-Command signature</div>
<br>
<strong>{{PIC_NAME}}</strong><br>
Part 107 Cert #: {{PIC_CERT_NUMBER}}<br>
Date: {{SIGN_DATE}}
</td>
<td style="width:50%; border:none;">
<div style="border-bottom: 1px solid #000; height: 40px;"></div>
<div style="font-size: 9pt; color: #64607a;">Reviewing Officer (if applicable)</div>
<br>
<strong>{{REVIEWER_NAME}}</strong><br>
{{REVIEWER_TITLE}}<br>
Date: {{REVIEW_DATE}}
</td>
</tr>
</table>

---

*This attestation block is required for all SAI deliverables. For insurance-claim-grade or litigation-support reports, a notarized variant is available upon request.*
