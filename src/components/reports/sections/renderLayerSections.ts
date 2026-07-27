import { makeNarrativeSection } from './GenericNarrative';
import { makeTableSection } from './GenericTable';

/**
 * Deliverables render layer (2026-07-27).
 * Configured instances of GenericNarrative / GenericTable, one per section
 * key added by the 2026-07-25 deliverables templates migration. Bespoke
 * sections (accuracy_checkpoint_report, datum_metadata, pci_rating) have
 * their own components. Field intent follows report-system-spec-v1 and the
 * capability-map migration labels.
 */

// ---------------------------------------------------------------------------
// Narrative sections (description + scalar fields + imagery)
// ---------------------------------------------------------------------------

export const CanopyHeightModel = makeNarrativeSection({
  title: 'Canopy Height Model',
  descriptionPlaceholder: 'DSM-minus-DTM canopy height model summary, clearance findings, stand characteristics...',
  fields: [
    { id: 'mean_height_ft', label: 'Mean Canopy Height (ft)', type: 'number' },
    { id: 'max_height_ft', label: 'Max Canopy Height (ft)', type: 'number' },
    { id: 'canopy_cover_pct', label: 'Canopy Cover (%)', type: 'number' },
    { id: 'analysis_area_acres', label: 'Analysis Area (acres)', type: 'number' },
  ],
  emptyImageLabel: 'No canopy height model attached',
});

export const ContoursTopo = makeNarrativeSection({
  title: 'Contours & Topographic Surface',
  descriptionPlaceholder: 'Contour generation summary: source surface, smoothing, coverage, notable terrain...',
  fields: [
    { id: 'contour_interval', label: 'Contour Interval', placeholder: 'e.g. 1 ft' },
    { id: 'index_interval', label: 'Index Interval', placeholder: 'e.g. 5 ft' },
    { id: 'surface_source', label: 'Surface Source', placeholder: 'DTM (bare earth) / DSM' },
    { id: 'vertical_datum', label: 'Vertical Datum', placeholder: 'e.g. NAVD88 (GEOID18)' },
  ],
  emptyImageLabel: 'No contour map attached',
});

export const CoverageQa = makeNarrativeSection({
  title: 'Coverage & Point-Density QA',
  descriptionPlaceholder: 'Coverage completeness, density uniformity, gaps or occlusions and their cause...',
  fields: [
    { id: 'coverage_pct', label: 'Coverage (%)', type: 'number' },
    { id: 'point_density', label: 'Point Density (pts/sq m)', type: 'number' },
    { id: 'gsd_cm', label: 'GSD (cm/px)', type: 'number' },
    { id: 'overlap_achieved', label: 'Overlap Achieved', placeholder: 'e.g. 80% front / 70% side' },
  ],
  emptyImageLabel: 'No coverage map attached',
});

export const HydrologyDrainage = makeNarrativeSection({
  title: 'Hydrology & Drainage',
  descriptionPlaceholder: 'Drainage paths, ponding areas, wetland indicators and delineated features...',
  fields: [
    { id: 'features_delineated', label: 'Features Delineated', type: 'number' },
    { id: 'study_area_acres', label: 'Study Area (acres)', type: 'number' },
    { id: 'flow_direction', label: 'Predominant Flow Direction', placeholder: 'e.g. NE toward outfall' },
  ],
  emptyImageLabel: 'No drainage map attached',
});

export const PropertyOverview = makeNarrativeSection({
  title: 'Property Overview',
  descriptionPlaceholder: 'Property description, access, structures present, site context at capture time...',
  fields: [
    { id: 'property_address', label: 'Property Address' },
    { id: 'parcel_id', label: 'Parcel ID' },
    { id: 'coordinates', label: 'Coordinates (lat, lng)' },
    { id: 'parcel_area_acres', label: 'Parcel Area (acres)', type: 'number' },
    { id: 'structure_type', label: 'Structure Type', placeholder: 'e.g. single-family, sanctuary, warehouse' },
    { id: 'year_built', label: 'Year Built' },
  ],
  emptyImageLabel: 'No location or overview image attached',
});

export const RoofPlanAnnotated = makeNarrativeSection({
  title: 'Annotated Roof Plan',
  descriptionPlaceholder: 'Scaled roof orthomosaic and plan annotations: slopes, penetrations, damage locations...',
  fields: [
    { id: 'plan_scale', label: 'Plan Scale', placeholder: 'e.g. 1 in = 20 ft' },
    { id: 'gsd_cm', label: 'GSD (cm/px)', type: 'number' },
    { id: 'roof_area_sqft', label: 'Roof Area (sq ft)', type: 'number' },
    { id: 'predominant_pitch', label: 'Predominant Pitch', placeholder: 'e.g. 6/12' },
  ],
  emptyImageLabel: 'No roof plan attached',
});

export const ScopeLimitations = makeNarrativeSection({
  title: 'Scope & Limitations',
  descriptionLabel: 'Limitations & Disclaimers Text',
  descriptionRows: 10,
  descriptionPlaceholder:
    'Standard limitations language: what an aerial visual record is and is not, scope exclusions, and measurement accuracy caveats.',
  showImages: false,
});

export const SensorLimitations = makeNarrativeSection({
  title: 'Sensor Scope & Limitations',
  descriptionLabel: 'Sensor Scope Statement',
  descriptionRows: 6,
  descriptionPlaceholder:
    'e.g. RGB-only capture: no true NDVI without a multispectral sensor, no thermal without a radiometric sensor, no bare earth under dense canopy without LiDAR.',
  showImages: false,
});

export const ViewshedLos = makeNarrativeSection({
  title: 'Viewshed / Line-of-Sight',
  descriptionPlaceholder: 'Viewshed or line-of-sight analysis summary: observer and target locations, obstructions...',
  fields: [
    { id: 'analysis_type', label: 'Analysis Type', placeholder: 'viewshed / point-to-point LOS' },
    { id: 'observer_height_ft', label: 'Observer Height (ft AGL)', type: 'number' },
    { id: 'target_height_ft', label: 'Target Height (ft AGL)', type: 'number' },
  ],
  emptyImageLabel: 'No viewshed or LOS map attached',
});

// ---------------------------------------------------------------------------
// Table sections (repeating records)
// ---------------------------------------------------------------------------

export const AppendixFieldForms = makeTableSection({
  title: 'Appendix: Field Forms',
  columns: [
    { id: 'form_name', label: 'Form' },
    { id: 'reference', label: 'Standard / Reference', placeholder: 'e.g. D6433 sample unit sheet' },
    { id: 'sample_unit', label: 'Sample Unit / Area' },
    { id: 'url', label: 'Link', type: 'url' },
  ],
  addLabel: 'Add Form',
  rowNoun: 'field forms',
  descriptionLabel: 'Forms Used',
});

export const CadHandoff = makeTableSection({
  title: 'CAD Handoff',
  columns: [
    { id: 'filename', label: 'File' },
    { id: 'format', label: 'Format', type: 'select', options: ['DXF', 'DWG', 'LandXML', 'GeoJSON', 'Shapefile', 'Other'] },
    { id: 'crs', label: 'CRS / EPSG' },
    { id: 'contents', label: 'Contents / Layers' },
    { id: 'url', label: 'Link', type: 'url' },
  ],
  addLabel: 'Add File',
  rowNoun: 'CAD files',
  fields: [{ id: 'target_software', label: 'Target Software', placeholder: 'e.g. Civil 3D, Carlson' }],
});

export const CrossSections = makeTableSection({
  title: 'Cross-Sections & Profiles',
  columns: [
    { id: 'section_id', label: 'ID', placeholder: 'e.g. XS-01' },
    { id: 'description', label: 'Description / Alignment' },
    { id: 'value', label: 'Length / Value', type: 'number' },
    { id: 'unit', label: 'Unit', placeholder: 'ft, m' },
  ],
  addLabel: 'Add Section',
  rowNoun: 'cross-sections',
  showImages: true,
  emptyImageLabel: 'No profile plots attached',
});

export const CutFill = makeTableSection({
  title: 'Cut / Fill Earthwork',
  columns: [
    { id: 'zone', label: 'Zone / Area' },
    { id: 'cut_cu_yd', label: 'Cut (cu yd)', type: 'number' },
    { id: 'fill_cu_yd', label: 'Fill (cu yd)', type: 'number' },
    { id: 'net_cu_yd', label: 'Net (cu yd)', type: 'number' },
  ],
  addLabel: 'Add Zone',
  rowNoun: 'earthwork zones',
  fields: [
    { id: 'reference_surface', label: 'Reference Surface', placeholder: 'e.g. design grade, prior-flight DTM' },
    { id: 'vertical_datum', label: 'Vertical Datum' },
  ],
  showImages: true,
});

export const MeasurementsAppendix = makeTableSection({
  title: 'Measurement Takeoff',
  columns: [
    { id: 'item', label: 'Item' },
    { id: 'method', label: 'Method', placeholder: 'e.g. orthomosaic scale' },
    { id: 'value', label: 'Value', type: 'number' },
    { id: 'unit', label: 'Unit' },
    { id: 'tolerance', label: 'Tolerance', placeholder: 'e.g. +/- 3%' },
  ],
  addLabel: 'Add Measurement',
  rowNoun: 'measurements',
  callout:
    'Quantities are a manual takeoff from aerial imagery and carry the stated tolerance. Verify all quantities before ordering materials.',
});

export const Model3dLink = makeTableSection({
  title: 'Interactive 3D Model',
  columns: [
    { id: 'label', label: 'Model' },
    { id: 'model_type', label: 'Type', type: 'select', options: ['Gaussian splat', 'Textured mesh', 'Point cloud', 'Other'] },
    { id: 'url', label: 'Viewer / Download Link', type: 'url' },
  ],
  addLabel: 'Add Model Link',
  rowNoun: 'model links',
  descriptionLabel: 'Viewing Instructions',
  showImages: true,
});

export const ObservationLog = makeTableSection({
  title: 'Observation Log',
  columns: [
    { id: 'obs_id', label: 'ID', placeholder: 'e.g. R-001' },
    { id: 'location', label: 'Location / Zone' },
    { id: 'condition_type', label: 'Condition / Type' },
    { id: 'rating', label: 'Rating', placeholder: 'per template vocabulary' },
    { id: 'quantity', label: 'Quantity', placeholder: 'e.g. 12 sq ft' },
    { id: 'photo_ref', label: 'Photo Ref' },
    { id: 'notes', label: 'Notes / Action' },
  ],
  addLabel: 'Add Observation',
  rowNoun: 'observations',
  descriptionLabel: 'Summary',
  descriptionPlaceholder:
    'Rating vocabulary is set by the template and audience (L/M/H severity, or Priority/Monitor/Informational for residential and white-label roof work).',
});

export const PlanimetricLinework = makeTableSection({
  title: 'Planimetric Linework',
  columns: [
    { id: 'layer', label: 'Layer' },
    { id: 'feature_type', label: 'Feature Type', placeholder: 'e.g. edge of pavement, building footprint' },
    { id: 'feature_count', label: 'Feature Count', type: 'number' },
    { id: 'format', label: 'Format', placeholder: 'e.g. DXF layer, SHP' },
  ],
  addLabel: 'Add Layer',
  rowNoun: 'linework layers',
  showImages: true,
  emptyImageLabel: 'No linework map attached',
});

export const PointCloudClassification = makeTableSection({
  title: 'Point Cloud Classification',
  columns: [
    { id: 'class_name', label: 'Class', placeholder: 'e.g. Ground, Vegetation, Building' },
    { id: 'points', label: 'Points', type: 'number' },
    { id: 'percent', label: '% of Cloud', type: 'number' },
  ],
  addLabel: 'Add Class',
  rowNoun: 'point classes',
  fields: [
    { id: 'total_points', label: 'Total Points' },
    { id: 'ground_density', label: 'Ground Density (pts/sq m)', type: 'number' },
    { id: 'method', label: 'Classification Method', placeholder: 'e.g. ODM SMRF, manual review' },
  ],
  showImages: true,
  emptyImageLabel: 'No classification imagery attached',
});

export const StockpileInventory = makeTableSection({
  title: 'Stockpile Inventory & Tonnage',
  columns: [
    { id: 'pile_id', label: 'Pile' },
    { id: 'material', label: 'Material' },
    { id: 'volume_cu_yd', label: 'Volume (cu yd)', type: 'number' },
    { id: 'density', label: 'Density (tons/cu yd)', type: 'number' },
    { id: 'tonnage', label: 'Tonnage (tons)', type: 'number' },
  ],
  addLabel: 'Add Stockpile',
  rowNoun: 'stockpiles',
  fields: [{ id: 'base_surface', label: 'Base Surface Method', placeholder: 'e.g. lowest-point plane, prior DTM' }],
  showImages: true,
});

export const StormHistory = makeTableSection({
  title: 'Storm Event History (NOAA)',
  columns: [
    { id: 'event_date', label: 'Date' },
    { id: 'event_type', label: 'Event Type', placeholder: 'e.g. hail, high wind' },
    { id: 'magnitude', label: 'Magnitude', placeholder: 'e.g. 1.25 in hail, 60 kt' },
    { id: 'distance_mi', label: 'Distance (mi)', type: 'number' },
    { id: 'source_ref', label: 'Source / Ref', placeholder: 'NOAA Storm Events episode ID' },
  ],
  addLabel: 'Add Event',
  rowNoun: 'storm events',
  callout:
    'Storm event data is third-party government record (NOAA). It is provided as factual context only; no opinion on causation is expressed or implied.',
});
