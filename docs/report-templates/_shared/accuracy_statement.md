# Accuracy & Quality Control Statement

> **Purpose**: Required for all mapping/survey/orthomosaic/volumetric deliverables, and recommended for any inspection report with measurement content. Aligned to ASPRS Positional Accuracy Standards for Digital Geospatial Data (2014, revised 2023) and FAA Advisory Circular 107-2.

---

## A. Acquisition Parameters

| Parameter | Value |
|---|---|
| Planned Altitude AGL | `{{ALTITUDE_FT}}` ft / `{{ALTITUDE_M}}` m |
| Planned Ground Sample Distance (GSD) | `{{GSD_CM}}` cm/px |
| Achieved GSD (mean) | `{{GSD_ACTUAL}}` cm/px |
| Forward Overlap | `{{FWD_OVERLAP}}` % |
| Side Overlap | `{{SIDE_OVERLAP}}` % |
| Flight Speed | `{{SPEED_MS}}` m/s |
| Camera Orientation | `{{NADIR_OR_OBLIQUE}}` (`{{OBLIQUE_ANGLE}}`° if oblique) |
| Total Images Captured | `{{IMG_COUNT}}` |
| Total Images Used | `{{IMG_USED}}` (`{{PCT_CALIBRATED}}` % calibrated) |

## B. Ground Control (GCP) Report

| GCP ID | Surveyed X (Easting) | Surveyed Y (Northing) | Surveyed Z (Elev) | Computed X | Computed Y | Computed Z | ΔX | ΔY | ΔZ | Use |
|---|---|---|---|---|---|---|---|---|---|---|
| GCP-01 | {{E}} | {{N}} | {{Z}} | {{E}} | {{N}} | {{Z}} | {{DX}} | {{DY}} | {{DZ}} | Control |
| GCP-02 | | | | | | | | | | Control |
| CP-01 | | | | | | | | | | Check |

**Coordinate System**: `{{EPSG_CODE}}` (e.g., EPSG:6347 — NAD83(2011) / UTM 18N + NAVD88 (Geoid18))
**Vertical Datum**: `{{VDATUM}}`
**Survey Equipment**: `{{RTK_UNIT}}` (e.g., Emlid Reach RS2+) — network RTK via `{{NTRIP_PROVIDER}}`
**Survey Accuracy**: Horizontal `{{H_ACC}}` cm, Vertical `{{V_ACC}}` cm (manufacturer spec under fixed solution)

## C. Computed Accuracy

### Control Point Residuals (used in bundle adjustment)

| Statistic | Horizontal (X,Y) | Vertical (Z) |
|---|---|---|
| Mean Error | `{{MEAN_H}}` cm | `{{MEAN_V}}` cm |
| RMSE | `{{RMSE_H}}` cm | `{{RMSE_V}}` cm |
| Max Absolute Error | `{{MAX_H}}` cm | `{{MAX_V}}` cm |

### Check Point Residuals (independent — not used in adjustment)

| Statistic | Horizontal (X,Y) | Vertical (Z) |
|---|---|---|
| RMSE | `{{RMSE_H_CHK}}` cm | `{{RMSE_V_CHK}}` cm |
| 95% Confidence (Accuracy_r) | `{{ACC_R_95}}` cm | `{{ACC_Z_95}}` cm |
| NSSDA 95% CE | `{{NSSDA_CE}}` cm | — |
| NSSDA 95% LE | — | `{{NSSDA_LE}}` cm |

### ASPRS Positional Accuracy Class

Per ASPRS Positional Accuracy Standards for Digital Geospatial Data, Edition 2 (2023):

- **Horizontal Accuracy Class**: `{{ASPRS_H_CLASS}}` (e.g., "5-cm Horizontal Accuracy Class")
- **Vertical Accuracy Class**: `{{ASPRS_V_CLASS}}` (e.g., "10-cm Vertical Accuracy Class")
- **Compliance Statement**: *This product tested `{{ACC_R}}` cm horizontal and `{{ACC_Z}}` cm vertical at the 95-percent confidence level.*

## D. Processing Environment

| Item | Value |
|---|---|
| Processing Software | `{{SOFTWARE}}` (e.g., WebODM 2.5.3 / Pix4Dmatic 1.54 / Agisoft Metashape 2.1) |
| Profile / Preset | `{{PROFILE}}` (e.g., "High resolution — high overlap") |
| Keypoint Match Type | `{{MATCH_TYPE}}` (aerial / generic / custom) |
| Feature Quality | `{{FEATURE_QUALITY}}` |
| Bundle Adjustment | `{{BUNDLE_METHOD}}` |
| Median Keypoints per Image | `{{MEDIAN_KP}}` |
| Median Matches per Image | `{{MEDIAN_MATCH}}` |
| Processing Hardware | `{{HW_DESCRIPTION}}` (CPU, GPU, RAM) |
| Processing Time | `{{DURATION}}` |

## E. Coverage & Overlap Quality

| Metric | Value |
|---|---|
| Total Area Covered | `{{AREA_ACRES}}` acres (`{{AREA_SQKM}}` km²) |
| Mean Overlap (forward × side) | `{{FWD}}% × {{SIDE}}%` |
| Minimum Overlap (weakest cell) | `{{MIN_OVERLAP}}` % |
| % Area with ≥5-image overlap | `{{GOOD_OVERLAP_PCT}}` % |
| Known Gaps / Low-coverage zones | `{{GAP_DESCRIPTION}}` (or "None") |

## F. Uncertainty Statement for Derived Measurements

The accuracy of measurements derived from this dataset inherits from the positional accuracy of the orthomosaic/DSM:

- **Linear measurements** (distances, perimeters): expected uncertainty ± `{{LINEAR_UNCERT}}` cm for features > 5 × GSD
- **Area measurements**: expected uncertainty ± `{{AREA_UNCERT_PCT}}` % relative error
- **Volumetric measurements**: expected uncertainty ± `{{VOL_UNCERT_PCT}}` % relative error when computed against a surveyed base surface
- **Elevation difference measurements**: expected uncertainty ± `{{ELEV_UNCERT}}` cm

Measurements in this report include their uncertainty envelope where quantitative values are cited.

## G. Limitations

- Accuracy above the reference surface — not below (sub-surface features not captured)
- Thermal and multispectral band accuracy reported separately where applicable
- GCP distribution: `{{GCP_DISTRIBUTION_NOTE}}` (e.g., "GCPs distributed at corners + 1 center; edge accuracy degraded")
- Vegetation / canopy effects noted in site-specific section

---

*Accuracy reporting follows ASPRS 2023 standards. Alternative standards (USGS NMAS, ICAO, ISO 19157) available on request for specific contract requirements.*
