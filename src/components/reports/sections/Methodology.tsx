import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { MethodologyData, ReportImage } from '@/types/report';

interface Props {
  data: MethodologyData;
  onChange: (data: MethodologyData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function Methodology({ data, onChange, mode }: Props) {
  const software = data.software ?? [];

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div><Label>Description</Label><Textarea rows={4} value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} /></div>
        <div><Label>Flight Pattern</Label><Input value={data.flight_pattern ?? ''} onChange={(e) => onChange({ ...data, flight_pattern: e.target.value })} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Altitude AGL</Label><Input value={data.altitude_agl ?? ''} onChange={(e) => onChange({ ...data, altitude_agl: e.target.value })} /></div>
          <div><Label>Overlap</Label><Input value={data.overlap ?? ''} onChange={(e) => onChange({ ...data, overlap: e.target.value })} /></div>
          <div><Label>GSD</Label><Input value={data.gsd ?? ''} onChange={(e) => onChange({ ...data, gsd: e.target.value })} /></div>
        </div>
        <div>
          <Label>Software Used</Label>
          {software.map((s, i) => (
            <div key={i} className="flex gap-2 mt-1">
              <Input value={s} onChange={(e) => { const n = [...software]; n[i] = e.target.value; onChange({ ...data, software: n }); }} />
              <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, software: software.filter((_, j) => j !== i) })}>Remove</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-1" onClick={() => onChange({ ...data, software: [...software, ''] })}>Add Software</Button>
        </div>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Methodology</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{data.description}</p>
      <div className="grid grid-cols-2 gap-2 text-sm" style={{ color: REPORT_COLORS.text }}>
        {data.flight_pattern && <p><strong>Pattern:</strong> {data.flight_pattern}</p>}
        {data.altitude_agl && <p><strong>Altitude:</strong> {data.altitude_agl}</p>}
        {data.overlap && <p><strong>Overlap:</strong> {data.overlap}</p>}
        {data.gsd && <p><strong>GSD:</strong> {data.gsd}</p>}
      </div>
      {software.length > 0 && <p className="text-sm"><strong>Software:</strong> {software.join(', ')}</p>}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
