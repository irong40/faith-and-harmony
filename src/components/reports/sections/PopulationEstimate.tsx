import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { PopulationEstimateData, ReportImage } from '@/types/report';

interface Props {
  data: PopulationEstimateData;
  onChange: (data: PopulationEstimateData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function PopulationEstimate({ data, onChange, mode }: Props) {
  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Estimate</Label><Input type="number" value={data.estimate} onChange={(e) => onChange({ ...data, estimate: +e.target.value })} /></div>
          <div><Label>Lower Bound</Label><Input type="number" value={data.lower_bound ?? ''} onChange={(e) => onChange({ ...data, lower_bound: +e.target.value })} /></div>
          <div><Label>Upper Bound</Label><Input type="number" value={data.upper_bound ?? ''} onChange={(e) => onChange({ ...data, upper_bound: +e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Confidence Level</Label><Input value={data.confidence_level ?? ''} onChange={(e) => onChange({ ...data, confidence_level: e.target.value })} placeholder="e.g. 95%" /></div>
          <div><Label>Trend</Label>
            <select className="w-full rounded border px-2 py-1.5 text-sm" value={data.trend ?? ''} onChange={(e) => onChange({ ...data, trend: e.target.value })}>
              <option value="">Select</option>
              {['increasing', 'stable', 'declining'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Prior Survey Estimate</Label><Input type="number" value={data.prior_survey_estimate ?? ''} onChange={(e) => onChange({ ...data, prior_survey_estimate: +e.target.value })} /></div>
          <div><Label>Prior Survey Date</Label><Input type="date" value={data.prior_survey_date ?? ''} onChange={(e) => onChange({ ...data, prior_survey_date: e.target.value })} /></div>
        </div>
        <div><Label>Methodology Note</Label><Textarea rows={2} value={data.methodology_note ?? ''} onChange={(e) => onChange({ ...data, methodology_note: e.target.value })} /></div>
      </div>
    );
  }

  const trendIcon = data.trend === 'increasing' ? 'Up' : data.trend === 'declining' ? 'Down' : 'Stable';

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Population Estimate</h2>
      <div className="rounded-lg p-6 text-center" style={{ background: REPORT_COLORS.bgCard, border: `1px solid ${REPORT_COLORS.border}` }}>
        <div className="text-4xl font-bold" style={{ color: REPORT_COLORS.primary }}>{(data.estimate ?? 0).toLocaleString()}</div>
        {(data.lower_bound != null || data.upper_bound != null) && (
          <div className="text-sm mt-1" style={{ color: REPORT_COLORS.textSecondary }}>
            {data.confidence_level ?? '95%'} CI: {data.lower_bound?.toLocaleString()} - {data.upper_bound?.toLocaleString()}
          </div>
        )}
        {data.trend && <div className="mt-2 text-sm capitalize" style={{ color: REPORT_COLORS.text }}>Trend: {trendIcon} ({data.trend})</div>}
      </div>
      {data.prior_survey_estimate != null && (
        <p className="text-sm" style={{ color: REPORT_COLORS.textSecondary }}>
          Prior survey ({data.prior_survey_date}): {data.prior_survey_estimate.toLocaleString()}
        </p>
      )}
      {data.methodology_note && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.methodology_note}</p>}
    </div>
  );
}
