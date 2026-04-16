import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { AppendixRawDataData, ReportImage } from '@/types/report';

interface Props {
  data: AppendixRawDataData;
  onChange: (data: AppendixRawDataData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function AppendixRawData({ data, onChange, mode }: Props) {
  const links = data.links ?? [];

  const update = (i: number, patch: Partial<typeof links[0]>) => {
    const n = [...links]; n[i] = { ...n[i], ...patch }; onChange({ ...data, links: n });
  };

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        {links.map((l, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Label</Label><Input value={l.label} onChange={(e) => update(i, { label: e.target.value })} /></div>
            <div className="flex-1"><Label className="text-xs">URL</Label><Input value={l.url} onChange={(e) => update(i, { url: e.target.value })} /></div>
            <div className="w-24"><Label className="text-xs">Format</Label><Input value={l.format ?? ''} onChange={(e) => update(i, { format: e.target.value })} /></div>
            <div className="w-24"><Label className="text-xs">Size</Label><Input value={l.size ?? ''} onChange={(e) => update(i, { size: e.target.value })} /></div>
            <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, links: links.filter((_, j) => j !== i) })}>Remove</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, links: [...links, { label: '', url: '' }] })}>Add Link</Button>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Appendix: Raw Data Downloads</h2>
      {links.length > 0 ? (
        <ul className="space-y-2">
          {links.map((l, i) => (
            <li key={i} className="flex items-center gap-3 rounded p-3 text-sm" style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg, border: `1px solid ${REPORT_COLORS.border}` }}>
              <a href={l.url} target="_blank" rel="noreferrer" className="font-medium" style={{ color: REPORT_COLORS.primary }}>{l.label}</a>
              {l.format && <span className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>{l.format}</span>}
              {l.size && <span className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>{l.size}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: REPORT_COLORS.textMuted }}>No raw data links provided.</p>
      )}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
