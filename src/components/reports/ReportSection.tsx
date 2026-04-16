import type { ReportImage, ReportSectionKey, SectionDataMap } from '@/types/report';
import {
  CoverPage, ExecutiveSummary, Methodology, Equipment, FlightData,
  WeatherConditions, Findings, SpeciesTable, PopulationEstimate,
  ConfidenceInterval, DetectionHeatmap, TransectMap, AnnotatedImagery,
  ChangeDetection, AnomalyLog, Volumetrics, DeliverablesManifest,
  AppendixFlightLogs, AppendixRawData,
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
};

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
