# Land Survey, Mapping & Orthomosaic Deliverable — SAI Template

> **Service line**: Photogrammetric mapping, orthomosaic, DSM/DTM, 3D model, volumetrics, topographic survey (non-PE-stamped)
> **Grade**: Commercial / Federal photogrammetric mapping deliverable, not PE-stamped. Positional accuracy is reported in §6 as a tested ASPRS 2023 accuracy class computed from independent check points. This is not a boundary survey and carries no surveyor's seal.
> **Based on**: ASPRS Positional Accuracy Standards 2023, Pix4D Quality Report structure, FGDC metadata standard
> **Cover letterhead**: `letterhead.html` with `{{DOCUMENT_TYPE}} = "Mapping & Survey Deliverable"`

---

## 1. Executive Summary

- **Project**: `{{PROJECT_NAME}}`
- **Area Mapped**: `{{ACRES}}` acres (`{{KM2}}` km²)
- **Ground Sample Distance achieved**: `{{GSD}}` cm/px
- **Positional Accuracy achieved (95% CI)**: Horizontal `{{H}}` cm, Vertical `{{V}}` cm
- **ASPRS Accuracy Class**: `{{CLASS}}`
- **Deliverables**: orthomosaic, DSM, point cloud, `{{OTHER}}`
- **Purpose**: `{{PURPOSE}}` (e.g., pre-construction baseline, volumetrics for stockpile inventory, topo for civil design drafting)
- **Coordinate system**: `{{EPSG}}` (horizontal), `{{VDATUM}}` (vertical)

## 2. Project Scope

- **Requested Deliverables**:
  - [ ] High-resolution orthomosaic (GeoTIFF, cloud-optimized)
  - [ ] DSM (Digital Surface Model)
  - [ ] DTM (Digital Terrain Model) — requires LiDAR or dense vegetation filtering
  - [ ] Point cloud (LAS 1.4 / LAZ, colorized)
  - [ ] 3D textured mesh (OBJ / 3D Tiles)
  - [ ] Contours at `{{INTERVAL}}` ft interval
  - [ ] Volumetric report for `{{FEATURES}}`
  - [ ] Topographic survey CAD-ready (DXF with layered contours + breaklines)
  - [ ] Cross-sections at `{{STATIONS}}`
  - [ ] Change detection vs prior flight `{{DATE}}`

- **Area of Interest**: polygon file `aoi.kml` attached
- **Accuracy target**: `{{H_TARGET}}` cm horizontal, `{{V_TARGET}}` cm vertical at 95% CI

## 3. Survey Control

### 3.1 Ground Control Points (GCPs)

| GCP ID | Type | Location | Surveyed X | Y | Z | Datum | Equipment | Operator |
|---|---|---|---|---|---|---|---|---|
| GCP-01 | Targeted (24" × 24" checker) | NW corner | | | | | `{{RTK}}` | `{{OP}}` |
| GCP-02 | | | | | | | | |

**Distribution**: `{{NUM}}` GCPs, pattern = `{{PATTERN}}` (perimeter + center recommended; edge density affects edge accuracy)
**Survey method**: Network RTK via `{{NTRIP}}` (VRS3 Max / state CORS / `{{SOURCE}}`) — fixed solution verified before each observation
**Horizontal datum**: `{{H_DATUM}}` (NAD83(2011) 2010.00 typical)
**Vertical datum**: `{{V_DATUM}}` (NAVD88 + Geoid18 typical)
**GCP accuracy (1σ)**: H `{{H_SIGMA}}` cm, V `{{V_SIGMA}}` cm

### 3.2 Check Points (independent)

`{{N_CHK}}` check points surveyed with same equipment but excluded from bundle adjustment. Used for independent accuracy verification — see §6.

### 3.3 RTK Base / PPK Workflow (if applicable)

| Field | Value |
|---|---|
| Aircraft RTK module | `{{MODULE}}` |
| Base station | `{{BASE}}` (local base / network RTK / PPK processed) |
| Positioning method | `{{METHOD}}` (RTK fixed / PPK post-processed kinematic) |
| Base coordinates | `{{BASE_XYZ}}` with uncertainty `{{BASE_UNC}}` |

## 4. Acquisition Parameters

| Parameter | Value |
|---|---|
| Aircraft | `{{AIRCRAFT}}` |
| Camera | `{{CAMERA}}` (focal length, sensor size, pixel pitch) |
| Altitude AGL | `{{ALT}}` ft |
| Target GSD | `{{GSD_TARGET}}` cm/px |
| Achieved GSD | `{{GSD_ACHIEVED}}` cm/px (mean) |
| Flight speed | `{{SPEED}}` m/s |
| Forward / Side overlap | `{{FWD}} / {{SIDE}}` % |
| Camera orientation | Nadir + `{{OBLIQUE_LIST}}` oblique orbits (if captured) |
| # Sorties | `{{SORTIES}}` |
| Total images | `{{N_TOTAL}}` (calibrated: `{{N_USED}}`, `{{PCT}}`%) |
| Flight plan software | `{{PLANNER}}` (DJI Pilot 2 / UgCS / Drone Harmony / Pix4Dcapture) |

## 5. Processing Workflow

| Stage | Tool | Profile | Notes |
|---|---|---|---|
| Ingest + QA | ExifTool, custom hash script | — | SHA-256 manifest created |
| Image alignment / SfM | `{{SOFTWARE}}` v`{{VER}}` | `{{PROFILE}}` | `{{KP}}` keypoints/image, `{{MATCH}}` matches |
| GCP tagging | `{{SOFTWARE}}` | Manual marking, `{{AVG_MARKS}}` per GCP | |
| Bundle adjustment | `{{SOFTWARE}}` | Full BA with self-calibration | Convergence `{{CONV}}` |
| Dense reconstruction | `{{SOFTWARE}}` | High density | `{{POINTS}}` M points |
| Mesh + texture | `{{SOFTWARE}}` | High quality | |
| Orthomosaic generation | `{{SOFTWARE}}` | Balanced blending | `{{GSD}}` cm/px |
| DSM generation | `{{SOFTWARE}}` | Inverse-distance weighted, 2× GSD | |
| DTM generation | `{{SOFTWARE}}` | Ground classification (SMRF / CSF) | `{{FILTER_PARAMS}}` |
| Point cloud export | `{{SOFTWARE}}` | LAS 1.4, colorized | |

**Hardware**: `{{CPU}}` / `{{GPU}}` / `{{RAM}}` / Total wall time `{{TIME}}`

## 6. Accuracy Report

*Full `_shared/accuracy_statement.md` block here, with tables filled.*

**Headline results**:

| Metric | Control Points | Check Points |
|---|---|---|
| N | `{{N_CTRL}}` | `{{N_CHK}}` |
| RMSE Horizontal | `{{H_CTRL}}` cm | `{{H_CHK}}` cm |
| RMSE Vertical | `{{V_CTRL}}` cm | `{{V_CHK}}` cm |
| 95% CI Horizontal | `{{H95_CTRL}}` cm | `{{H95_CHK}}` cm |
| 95% CI Vertical | `{{V95_CTRL}}` cm | `{{V95_CHK}}` cm |

**ASPRS 2023 Accuracy Class assignment**: This product tested `{{H}}` cm horizontal and `{{V}}` cm vertical at the 95-percent confidence level, qualifying the deliverable for the **`{{H_CLASS}} Horizontal Accuracy Class`** and **`{{V_CLASS}} Vertical Accuracy Class`**.

## 7. Coverage & Quality Maps

- **Overlap heatmap**: Appendix A-1 — color-coded # overlapping images per pixel
- **Reprojection error per tie point**: Appendix A-2
- **GCP residual map**: Appendix A-3
- **Known low-coverage zones**: `{{LIST}}`

## 8. Volumetrics (if contracted)

### 8.1 Stockpile / Cut-Fill Report

| Feature | Base Surface | Method | Volume (cy) | Volume (m³) | Uncertainty ± |
|---|---|---|---|---|---|
| Stockpile 1 — aggregate | Lowest toe contour, auto-detected | Triangulated prism | `{{V_CY}}` | `{{V_M3}}` | `{{UNC}}` % |
| Stockpile 2 — topsoil | | | | | |
| Cut area A | From design DTM | TIN-to-TIN | | | |
| Fill area B | | | | | |

### 8.2 Methodology

- **Base surface**: `{{METHOD}}` (auto-detected toe / surveyed pre-disturbance DTM / design grade imported from CAD)
- **Volume computation**: `{{ALGORITHM}}` (triangulated prism / grid-cell summation)
- **Density assumptions (if mass requested)**: `{{DENSITY}}` — client-supplied; not validated by SAI
- **Angle of repose check**: `{{CHECK_RESULT}}`

## 9. Contours & CAD Deliverables (if contracted)

- Contour interval: `{{INT}}` ft major / `{{MINOR}}` ft minor
- Smoothing: `{{SMOOTH}}` (tension spline / none)
- Breaklines: `{{INCLUDED}}` (pavement edges, curb, drainage)
- CAD file layers:
  - `0-BOUNDARY` (site outline)
  - `1-CONTOURS-MAJOR`
  - `1-CONTOURS-MINOR`
  - `2-BREAKLINES`
  - `3-SPOT-ELEVATIONS`
  - `4-STRUCTURES`
  - `5-ANNOTATION`

## 10. Change Detection (recurring missions)

| Prior Flight | Current Flight | DEM-of-Difference | Key Changes |
|---|---|---|---|
| `{{PRIOR_DATE}}` | `{{CURRENT}}` | `dod.tif` | Volume delta `{{DV}}`, new features `{{LIST}}` |

## 11. Deliverables Manifest

*Include full `_shared/data_rights.md` §E table populated with sizes and SHA-256 hashes.*

## 12. Metadata

- FGDC CSDGM XML: `metadata_fgdc.xml`
- ISO 19115 XML: `metadata_iso.xml`
- Coordinate system definition: PRJ + embedded in GeoTIFF

## 13. Limitations & Disclaimers

*Include `_shared/limitations_disclaimers.md` Sections A + B.4 (mapping) + C.*

Mapping-specific:
- **Not a boundary survey.** Deliverables are photogrammetric products, not legal land surveys. Boundary, easement, encroachment, or adverse-possession determinations require a licensed Professional Land Surveyor.
- **Vegetation and canopy effects**: DSM reflects surface (tops of vegetation); DTM requires ground filtering and is less reliable in dense canopy without LiDAR.
- **Accuracy envelope** as stated in §6 governs all derived measurements.

## 14. Compliance Attestation

*Include `_shared/compliance_attestation.md`.*

## 15. Chain of Custody

*Optional for commercial mapping; required for federal deliverables. Include `_shared/chain_of_custody.md` when applicable.*

## 16. Data Rights

*Required for federal; optional for commercial. Include `_shared/data_rights.md`.*

## 17. Appendices

- **A** — Quality maps (overlap, reprojection error, GCP residuals)
- **B** — Full GCP / CP coordinate table with residuals
- **C** — Flight logs + LAANC authorization
- **D** — Processing report (unedited export from SfM software)
- **E** — Metadata XML files
- **F** — CAD deliverables (layered DXF)
- **G** — Sample measurement validation (spot-check against known-length features)

---

*Questions: info@sentinelaerialinspections.com.*
