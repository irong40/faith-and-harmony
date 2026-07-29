import type { ReportImage, ReportSectionKey, SectionDataMap } from '@/types/report';
import {
  CoverPage, ExecutiveSummary, Methodology, Equipment, FlightData,
  WeatherConditions, Findings, SpeciesTable, PopulationEstimate,
  ConfidenceInterval, DetectionHeatmap, TransectMap, AnnotatedImagery,
  ChangeDetection, AnomalyLog, Volumetrics, DeliverablesManifest,
  AppendixFlightLogs, AppendixRawData,
  // Deliverables render layer (2026-07-27)
  AccuracyCheckpointReport, AppendixFieldForms, CadHandoff, CanopyHeightModel,
  ContoursTopo, CoverageQa, CrossSections, CutFill, DatumMetadata,
  HydrologyDrainage, MeasurementsAppendix, Model3dLink, ObservationLog,
  PciRating, PlanimetricLinework, PointCloudClassification, PropertyOverview,
  RoofPlanAnnotated, ScopeLimitations, SensorLimitations, StockpileInventory,
  StormHistory, ViewshedLos,
} from './sections';

interface Props<K extends ReportSectionKey> {
  sectionKey: K;
  data: SectionDataMap[K];
  onChange: (data: SectionDataMap[K]) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const sectionMap: Record<ReportSectionKey, React.ComponentType<any>> = {
  cover_page: CoverPage,
  executive_summary: ExecutiveSummary,
  methodology: Methodology,
  equipment: Equipment,
  flight_data: FlightData,
  weather_conditions: WeatherConditions,
  findings: Findings,
  species_table: SpeciesTable,
  population_estimate: PopulationEstimate,
  confidence_interval: ConfidenceInterval,
  detection_heatmap: DetectionHeatmap,
  transect_map: TransectMap,
  annotated_imagery: AnnotatedImagery,
  change_detection: ChangeDetection,
  anomaly_log: AnomalyLog,
  volumetrics: Volumetrics,
  deliverables_manifest: DeliverablesManifest,
  appendix_flight_logs: AppendixFlightLogs,
  appendix_raw_data: AppendixRawData,
  // Deliverables render layer (2026-07-27)
  accuracy_checkpoint_report: AccuracyCheckpointReport,
  appendix_field_forms: AppendixFieldForms,
  cad_handoff: CadHandoff,
  canopy_height_model: CanopyHeightModel,
  contours_topo: ContoursTopo,
  coverage_qa: CoverageQa,
  cross_sections: CrossSections,
  cut_fill: CutFill,
  datum_metadata: DatumMetadata,
  hydrology_drainage: HydrologyDrainage,
  measurements_appendix: MeasurementsAppendix,
  model_3d_link: Model3dLink,
  observation_log: ObservationLog,
  pci_rating: PciRating,
  planimetric_linework: PlanimetricLinework,
  point_cloud_classification: PointCloudClassification,
  property_overview: PropertyOverview,
  roof_plan_annotated: RoofPlanAnnotated,
  scope_limitations: ScopeLimitations,
  sensor_limitations: SensorLimitations,
  stockpile_inventory: StockpileInventory,
  storm_history: StormHistory,
  viewshed_los: ViewshedLos,
};

/**
 * Shallow content check shared by the builder's empty-section warning and
 * ReportPrintView's omission logic, so "will be omitted from the printed
 * report" and what actually prints can never disagree. A section whose
 * data is missing, or whose top-level values are all null/""/[] (e.g. the
 * operator typed and then cleared a field), has no printable content.
 */
export function isSectionDataEmpty(d: unknown): boolean {
  return (
    !d ||
    Object.values(d as Record<string, unknown>).every(
      (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0)
    )
  );
}

export function ReportSection<K extends ReportSectionKey>({
  sectionKey, data, onChange, mode, images, onImagesChange,
}: Props<K>) {
  const Component = sectionMap[sectionKey];
  if (!Component) return <div>Unknown section: {sectionKey}</div>;
  // Guard: if data is undefined/null and we're in preview mode, show placeholder
  if (!data && mode === 'preview') return null;
  // For edit mode with no data, pass an empty object so forms render with blank fields
  const safeData = data ?? ({} as SectionDataMap[K]);
  return <Component data={safeData} onChange={onChange} mode={mode} images={images} onImagesChange={onImagesChange} />;
}
