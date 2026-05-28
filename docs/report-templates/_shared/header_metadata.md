# Universal Flight / Mission Metadata Block

> **Purpose**: Every SAI deliverable begins with this block. Do not ship a report without it filled in. Blank or "N/A" fields must be explicitly marked, not omitted.

---

## Report Identification

| Field | Value |
|---|---|
| Report ID | `{{REPORT_ID}}` (format: `SAI-YYYYMMDD-NNN`) |
| Report Version | `{{VERSION}}` (e.g., 1.0, 1.1-revised) |
| Report Date | `{{REPORT_DATE}}` (ISO: YYYY-MM-DD) |
| Report Type | `{{REPORT_TYPE}}` (Wildlife Census / Inspection / Survey / Mapping / SAR / etc.) |
| Classification | `{{CLASSIFICATION}}` (UNCLASSIFIED / CUI / FOUO / PROPRIETARY) |
| Distribution | `{{DISTRIBUTION}}` (Client-only / Client+Carrier / Public / Controlled) |

## Client & Engagement

| Field | Value |
|---|---|
| Client (Legal Entity) | `{{CLIENT_LEGAL_NAME}}` |
| Client Contact | `{{CLIENT_POC_NAME}}`, `{{CLIENT_POC_TITLE}}` |
| Client Email / Phone | `{{CLIENT_POC_EMAIL}}` / `{{CLIENT_POC_PHONE}}` |
| Contract / PO # | `{{CONTRACT_OR_PO}}` |
| Statement of Work ref. | `{{SOW_REF}}` |
| Project Number (SAI) | `{{SAI_PROJECT_NUMBER}}` |

## Site & Mission

| Field | Value |
|---|---|
| Site Name | `{{SITE_NAME}}` |
| Site Address | `{{SITE_ADDRESS}}` |
| Coordinates (WGS84) | `{{LAT}}, {{LONG}}` (decimal degrees, 6 places) |
| Parcel / APN | `{{PARCEL_ID}}` (if applicable) |
| Total Area Covered | `{{AREA}}` acres / km² |
| Mission Objective | `{{OBJECTIVE}}` (one sentence) |

## Flight Operations

| Field | Value |
|---|---|
| Flight Date(s) | `{{FLIGHT_DATES}}` |
| Time on Site | `{{START_TIME}} – {{END_TIME}}` (local, include UTC offset) |
| # Sorties | `{{NUM_SORTIES}}` |
| Total Flight Time | `{{FLIGHT_HHMM}}` |
| Remote PIC | `{{PIC_NAME}}` |
| Part 107 Cert # | `{{PIC_CERT_NUMBER}}` (expires `{{PIC_EXPIRY}}`) |
| Visual Observer(s) | `{{VO_NAMES}}` or "None — VLOS operation by PIC" |
| Ground Crew | `{{CREW_NAMES_ROLES}}` |

## Aircraft & Sensors

| Field | Value |
|---|---|
| Aircraft | `{{AIRCRAFT_MAKE_MODEL}}` |
| Aircraft Serial | `{{AIRCRAFT_SN}}` |
| FAA Registration | `{{FAA_REG_NUMBER}}` (FA-XXXXXXXXXX) |
| Remote ID | `{{REMOTE_ID_STATUS}}` (Built-in / Broadcast Module SN) |
| Primary Sensor | `{{SENSOR_1_MODEL}}` — resolution, focal length |
| Thermal Sensor | `{{THERMAL_MODEL}}` — resolution, spectral band, emissivity setting |
| Additional Sensors | `{{SENSOR_N}}` (multispectral, LiDAR, RTK module, etc.) |
| Last Calibration | `{{CAL_DATE}}` |

## Airspace & Regulatory

| Field | Value |
|---|---|
| Airspace Class | `{{AIRSPACE_CLASS}}` (G / E / D / C / B) |
| Nearest Controlled Airport | `{{AIRPORT_ID}}` (`{{DISTANCE_NM}}` nm) |
| LAANC Authorization | `{{LAANC_ID}}` (or N/A if Class G below 400 ft AGL) |
| Part 107 Waiver(s) | `{{WAIVER_NUMBERS}}` (e.g., 107.29 night, 107.31 BVLOS, 107.39 OOP) |
| TFR Check | `{{TFR_STATUS}}` (cleared via B4UFLY, timestamp) |
| NOTAM(s) issued | `{{NOTAMS}}` (if applicable) |

## Weather On-Site (at time of flight)

| Field | Value |
|---|---|
| Source | METAR `{{STATION_ID}}` @ `{{METAR_TIME}}` |
| Wind | `{{WIND_DIR}}° @ {{WIND_SPEED}} kts`, gusts `{{GUST}}` kts |
| Temperature | `{{TEMP}}°F / °C` |
| Visibility | `{{VIS}}` sm |
| Cloud Ceiling | `{{CEILING}}` ft AGL |
| Precipitation | `{{PRECIP}}` |
| Dew Point / Humidity | `{{DEWPT}}` / `{{RH}}%` |
| Solar Angle (if relevant) | `{{SOLAR_ANGLE}}`° at mid-flight |

## Insurance

| Field | Value |
|---|---|
| Carrier | `{{INSURANCE_CARRIER}}` |
| Policy # | `{{POLICY_NUMBER}}` |
| Liability Limit | $`{{LIMIT}}` (per occurrence) |
| Coverage Effective | `{{POLICY_START}} – {{POLICY_END}}` |
| Certificate on file with Client? | `{{YES_NO}}` |

---

*Usage: copy this block into every report and fill all fields before delivery. If a field is truly not applicable, write "N/A — [brief reason]" rather than leaving it blank.*
