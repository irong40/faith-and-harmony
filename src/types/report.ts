/**
 * Report Builder types.
 * Wildlife Census uses all sections; other templates enable subsets.
 */

export type ReportSectionKey =
  | 'cover_page'
  | 'executive_summary'
  | 'methodology'
  | 'equipment'
  | 'flight_data'
  | 'weather_conditions'
  | 'findings'
  | 'species_table'
  | 'population_estimate'
  | 'confidence_interval'
  | 'detection_heatmap'
  | 'transect_map'
  | 'annotated_imagery'
  | 'change_detection'
  | 'anomaly_log'
  | 'volumetrics'
  | 'deliverables_manifest'
  | 'appendix_flight_logs'
  | 'appendix_raw_data'
  // Deliverables render layer (2026-07-27) — keys used by the 2026-07-25
  // deliverables templates migration. Enum values staged in
  // supabase/migrations/20260727210000_report_section_keys_render_layer.sql
  | 'accuracy_checkpoint_report'
  | 'appendix_field_forms'
  | 'cad_handoff'
  | 'canopy_height_model'
  | 'contours_topo'
  | 'coverage_qa'
  | 'cross_sections'
  | 'cut_fill'
  | 'datum_metadata'
  | 'hydrology_drainage'
  | 'measurements_appendix'
  | 'model_3d_link'
  | 'observation_log'
  | 'pci_rating'
  | 'planimetric_linework'
  | 'point_cloud_classification'
  | 'property_overview'
  | 'roof_plan_annotated'
  | 'scope_limitations'
  | 'sensor_limitations'
  | 'stockpile_inventory'
  | 'storm_history'
  | 'viewshed_los';

export type ReportStatus = 'draft' | 'final' | 'archived';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type FindingReviewStatus = 'pending' | 'approved' | 'rejected' | 'modified';

// ---- Section Manifest (from report_templates.sections_manifest) ----

export interface SectionManifestEntry {
  key: ReportSectionKey;
  label: string;
  required: boolean;
  default_content?: Record<string, unknown>;
}

// ---- Section Data Shapes (stored in job_reports.section_data[key]) ----

export interface CoverPageData {
  title: string;
  subtitle?: string;
  client_name: string;
  client_company?: string;
  property_address: string;
  report_date: string;
  job_number: string;
  pilot_name: string;
  prepared_by: string;
  classification: string;
}

export interface ExecutiveSummaryData {
  summary: string; // rich text / markdown
  key_metrics?: { label: string; value: string }[];
}

export interface MethodologyData {
  description: string;
  flight_pattern?: string; // grid, crosshatch, orbit, transect, etc.
  altitude_agl?: string;
  overlap?: string;
  gsd?: string;
  software?: string[];
  notes?: string;
}

export interface EquipmentData {
  aircraft_name: string;
  aircraft_model?: string;
  camera?: string;
  sensor_specs?: string;
  rtk_enabled?: boolean;
  additional_sensors?: string[];
  notes?: string;
}

export interface FlightDataEntry {
  flight_number: number;
  date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  altitude_agl?: number;
  area_covered_acres?: number;
  photo_count?: number;
  video_count?: number;
  airdata_url?: string;
}

export interface FlightDataData {
  flights: FlightDataEntry[];
  total_area_acres?: number;
  total_flight_time_minutes?: number;
  total_photos?: number;
}

export interface WeatherData {
  temperature_f?: number;
  wind_speed_mph?: number;
  wind_direction?: string;
  wind_gusts_mph?: number;
  cloud_cover?: string;
  visibility?: string;
  precipitation?: string;
  station?: string;
  notes?: string;
}

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  location?: string;
  gps_lat?: number;
  gps_lng?: number;
  recommendation?: string;
  image_urls?: string[];
  // Human review gate
  review_status: FindingReviewStatus;
  reviewer_notes?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface FindingsData {
  findings: Finding[];
  summary?: string;
}

export interface SpeciesEntry {
  species: string;
  count: number;
  confidence?: string; // "high", "medium", "low"
  notes?: string;
}

export interface SpeciesTableData {
  species: SpeciesEntry[];
  total_count: number;
  survey_area_acres?: number;
}

export interface PopulationEstimateData {
  estimate: number;
  lower_bound?: number;
  upper_bound?: number;
  confidence_level?: string; // "90%", "95%"
  methodology_note?: string;
  prior_survey_estimate?: number;
  prior_survey_date?: string;
  trend?: string; // "increasing", "stable", "declining"
}

export interface ConfidenceIntervalData {
  sample_size?: number;
  detection_probability?: number;
  effective_strip_width?: number;
  transect_length_km?: number;
  methodology?: string;
  notes?: string;
}

export interface DetectionHeatmapData {
  description?: string;
  legend?: string;
  // Images attached via report_images table with section_key = 'detection_heatmap'
}

export interface TransectMapData {
  description?: string;
  total_transect_km?: number;
  area_covered_acres?: number;
  // Images attached via report_images table with section_key = 'transect_map'
}

export interface AnnotatedImageryData {
  description?: string;
  // Images attached via report_images table with section_key = 'annotated_imagery'
}

export interface ChangeDetectionData {
  description?: string;
  comparison_date?: string;
  changes_found?: number;
  // Images (before/after pairs) via report_images
}

export interface AnomalyEntry {
  id: string;
  timestamp?: string;
  gps_lat?: number;
  gps_lng?: number;
  anomaly_type: string;
  severity: FindingSeverity;
  description: string;
  thumbnail_url?: string;
  notes?: string;
  // Human review gate
  review_status: FindingReviewStatus;
  reviewer_notes?: string;
}

export interface AnomalyLogData {
  anomalies: AnomalyEntry[];
  summary?: string;
}

export interface VolumetricEntry {
  name: string;
  type: 'cut' | 'fill' | 'stockpile' | 'area';
  value: number;
  unit: string; // "cu yd", "sq ft", "acres"
  notes?: string;
}

export interface VolumetricsData {
  measurements: VolumetricEntry[];
  reference_surface?: string;
  datum?: string;
  notes?: string;
}

export interface DeliverableEntry {
  filename: string;
  type: string; // "Photo", "Video", "Orthomosaic", "GeoTIFF", "Shapefile", "Point Cloud", etc.
  file_size?: string;
  download_url?: string;
  notes?: string;
}

export interface DeliverablesManifestData {
  deliverables: DeliverableEntry[];
  delivery_method?: string;
  download_link?: string;
  expires_at?: string;
}

export interface FlightLogEntry {
  flight_number: number;
  airdata_url?: string;
  duration?: string;
  max_altitude?: string;
  max_distance?: string;
  takeoff_gps?: string;
}

export interface AppendixFlightLogsData {
  logs: FlightLogEntry[];
  airdata_profile_url?: string;
  notes?: string;
}

export interface AppendixRawDataData {
  links: { label: string; url: string; format?: string; size?: string }[];
  notes?: string;
}

// ---- Deliverables render layer (2026-07-27) ----
// Two generic data shapes back most of the new sections; the components are
// parameterized per key via config (see sections/renderLayerSections.ts).
// Values are stored as strings: they are jsonb-backed free-form report inputs.

/** Narrative + optional scalar fields (config-driven). */
export interface GenericNarrativeSectionData {
  description?: string;
  values?: Record<string, string>;
  notes?: string;
}

/** Row table + optional narrative and scalar fields (config-driven). */
export interface GenericTableSectionData {
  description?: string;
  values?: Record<string, string>;
  rows?: Record<string, string>[];
  notes?: string;
}

// ---- ASPRS accuracy & checkpoint report (bespoke) ----
// Statement wording is VERBATIM per ASPRS Positional Accuracy Standards,
// Edition 2, Version 2 (2024) §7.16 — never paraphrased. The operator picks
// the case; the fixed wording renders with their numbers inserted.

export type AccuracyStatementCase = 'tested_30plus' | 'produced' | 'tested_reduced';

export type AccuracyProductType = 'horizontal' | 'nva' | 'vva' | 'threed';

export interface AccuracyProductEntry {
  included?: boolean;
  class_cm?: string; // accuracy class (cm)
  tested_cm?: string; // tested RMSE (cm); for 3D this is the NVA-tested-area figure
  tested_cm_vva?: string; // 3D only: RMSE_3D within the VVA tested area (omittable by mutual agreement)
}

export interface AccuracyCheckpointReportData {
  statement_case?: AccuracyStatementCase;
  checkpoint_count?: string;
  products?: Partial<Record<AccuracyProductType, AccuracyProductEntry>>;
  gsd?: string; // stated alongside the accuracy statement per the standard
  datum_note?: string; // datum / epoch reference (full detail lives in datum_metadata)
  notes?: string;
}

// ---- Datum, geoid & epoch (bespoke) ----
// Exists because ITRF2014 vs NAD83(2011) is a 1-2 m absolute offset trap.

export interface DatumMetadataData {
  horizontal_datum?: string; // e.g. NAD83(2011)
  vertical_datum?: string; // e.g. NAVD88
  geoid_model?: string; // e.g. GEOID18
  epoch?: string; // e.g. 2010.00
  crs_epsg?: string; // e.g. EPSG:6346
  notes?: string;
}

// ---- PCI score & rating band (bespoke, ASTM D6433) ----
// The distress inventory (observation_log) is deliverable without a license;
// a defensible PCI score is not, until ASTM D6433 deduct curves are licensed.

export interface PciSampleUnitEntry {
  unit_id: string;
  pci?: string;
  band?: string;
  notes?: string;
}

export interface PciRatingData {
  d6433_licensed?: boolean;
  overall_pci?: string;
  rating_band?: string;
  sample_units?: PciSampleUnitEntry[];
  notes?: string;
}

// ---- Union type for section data ----

export type SectionDataMap = {
  cover_page: CoverPageData;
  executive_summary: ExecutiveSummaryData;
  methodology: MethodologyData;
  equipment: EquipmentData;
  flight_data: FlightDataData;
  weather_conditions: WeatherData;
  findings: FindingsData;
  species_table: SpeciesTableData;
  population_estimate: PopulationEstimateData;
  confidence_interval: ConfidenceIntervalData;
  detection_heatmap: DetectionHeatmapData;
  transect_map: TransectMapData;
  annotated_imagery: AnnotatedImageryData;
  change_detection: ChangeDetectionData;
  anomaly_log: AnomalyLogData;
  volumetrics: VolumetricsData;
  deliverables_manifest: DeliverablesManifestData;
  appendix_flight_logs: AppendixFlightLogsData;
  appendix_raw_data: AppendixRawDataData;
  // Deliverables render layer (2026-07-27)
  accuracy_checkpoint_report: AccuracyCheckpointReportData;
  appendix_field_forms: GenericTableSectionData;
  cad_handoff: GenericTableSectionData;
  canopy_height_model: GenericNarrativeSectionData;
  contours_topo: GenericNarrativeSectionData;
  coverage_qa: GenericNarrativeSectionData;
  cross_sections: GenericTableSectionData;
  cut_fill: GenericTableSectionData;
  datum_metadata: DatumMetadataData;
  hydrology_drainage: GenericNarrativeSectionData;
  measurements_appendix: GenericTableSectionData;
  model_3d_link: GenericTableSectionData;
  observation_log: GenericTableSectionData;
  pci_rating: PciRatingData;
  planimetric_linework: GenericTableSectionData;
  point_cloud_classification: GenericTableSectionData;
  property_overview: GenericNarrativeSectionData;
  roof_plan_annotated: GenericNarrativeSectionData;
  scope_limitations: GenericNarrativeSectionData;
  sensor_limitations: GenericNarrativeSectionData;
  stockpile_inventory: GenericTableSectionData;
  storm_history: GenericTableSectionData;
  viewshed_los: GenericNarrativeSectionData;
};

// ---- Report Image (from report_images table) ----

export interface ReportImage {
  id: string;
  report_id: string;
  section_key: ReportSectionKey;
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  sort_order: number;
  metadata?: Record<string, unknown>;
}

// ---- Template (from report_templates table) ----

export interface ReportTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  service_type: string;
  sections_manifest: SectionManifestEntry[];
  brand_config?: Record<string, unknown>;
  is_active: boolean;
}

// ---- Job Report (from job_reports table) ----

export interface JobReport {
  id: string;
  job_id?: string;
  client_id?: string;
  template_id: string;
  generated_document_id?: string;
  status: ReportStatus;
  title: string;
  section_data: Partial<SectionDataMap>;
  active_sections: ReportSectionKey[];
  report_date: string;
  prepared_by: string;
  classification: string;
  created_at: string;
  updated_at: string;
}
