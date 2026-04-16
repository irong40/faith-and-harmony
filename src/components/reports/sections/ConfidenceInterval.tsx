import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { ConfidenceIntervalData, ReportImage } from '@/types/report';

interface Props {
  data: ConfidenceIntervalData;
  onChange: (data: ConfidenceIntervalData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function ConfidenceInterval({ data, onChange, mode }: Props) {
  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Sample Size</Label><Input type="number" value={data.sample_size ?? ''} onChange={(e) => onChange({ ...data, sample_size: +e.target.value })} /></div>
          <div><Label>Detection Probability</Label><Input type="number" step="0.01" value={data.detection_probability ?? ''} onChange={(e) => onChange({ ...data, detection_probability: +e.target.value })} /></div>
          <div><Label>Effective Strip Width (m)</Label><Input type="number" value={data.effective_strip_width ?? ''} onChange={(e) => onChange({ ...data, effective_strip_width: +e.target.value })} /></div>
          <div><Label>Transect Length (km)</Label><Input type="number" step="0.1" value={data.transect_length_km ?? ''} onChange={(e) => onChange({ ...data, transect_length_km: +e.target.value })} /></div>
        </div>
        <div><Label>Methodology</Label><Input value={data.methodology ?? ''} onChange={(e) => onChange({ ...data, methodology: e.target.value })} /></div>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  const stats = [
    data.sample_size != null ? ['Sample Size', String(data.sample_size)] : null,
    data.detection_probability != null ? ['Detection Probability', `${(data.detection_probability * 100).toFixed(1)}%`] : null,
    data.effective_strip_width != null ? ['Effective Strip Width', `${data.effective_strip_width} m`] : null,
    data.transect_length_km != null ? ['Transect Length', `${data.transect_length_km} km`] : null,
    data.methodology ? ['Methodology', data.methodology] : null,
  ].filter(Boolean) as string[][];

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Confidence Interval Parameters</h2>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(([label, value], i) => (
          <div key={i} className="rounded p-3" style={{ background: REPORT_COLORS.bgCard, border: `1px solid ${REPORT_COLORS.border}` }}>
            <div className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>{label}</div>
            <div className="text-lg font-semibold" style={{ color: REPORT_COLORS.heading }}>{value}</div>
          </div>
        ))}
      </div>
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
