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
  | 'appendix_raw_data';

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
