import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { ExecutiveSummaryData, ReportImage } from '@/types/report';

interface Props {
  data: ExecutiveSummaryData;
  onChange: (data: ExecutiveSummaryData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function ExecutiveSummary({ data, onChange, mode }: Props) {
  const metrics = data.key_metrics ?? [];

  if (mode === 'edit') {
    return (
      <div className="space-y-4">
        <div>
          <Label>Summary</Label>
          <Textarea rows={6} value={data.summary} onChange={(e) => onChange({ ...data, summary: e.target.value })} />
        </div>
        <div>
          <Label>Key Metrics</Label>
          {metrics.map((m, i) => (
            <div key={i} className="flex gap-2 mt-2">
              <Input placeholder="Label" value={m.label} onChange={(e) => { const n = [...metrics]; n[i] = { ...m, label: e.target.value }; onChange({ ...data, key_metrics: n }); }} />
              <Input placeholder="Value" value={m.value} onChange={(e) => { const n = [...metrics]; n[i] = { ...m, value: e.target.value }; onChange({ ...data, key_metrics: n }); }} />
              <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, key_metrics: metrics.filter((_, j) => j !== i) })}>Remove</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-2" onClick={() => onChange({ ...data, key_metrics: [...metrics, { label: '', value: '' }] })}>Add Metric</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Executive Summary</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.summary}</p>
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {metrics.map((m, i) => (
            <div key={i} className="rounded p-3 text-center" style={{ background: REPORT_COLORS.bgCard, border: `1px solid ${REPORT_COLORS.border}` }}>
              <div className="text-lg font-bold" style={{ color: REPORT_COLORS.primary }}>{m.value}</div>
              <div className="text-xs" style={{ color: REPORT_COLORS.textSecondary }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
