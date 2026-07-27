import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { DatumMetadataData, ReportImage } from '@/types/report';

interface Props {
  data: DatumMetadataData;
  onChange: (data: DatumMetadataData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

/**
 * Datum, Geoid & Epoch. This section exists because ITRF2014 (RTK default)
 * vs NAD83(2011) is a 1-2 m absolute offset: every measured product must
 * state the datum, geoid, and epoch actually used. Record only; no logic.
 */

const FIELDS: { id: keyof DatumMetadataData; label: string; placeholder: string }[] = [
  { id: 'horizontal_datum', label: 'Horizontal Datum', placeholder: 'e.g. NAD83(2011) or ITRF2014' },
  { id: 'vertical_datum', label: 'Vertical Datum', placeholder: 'e.g. NAVD88' },
  { id: 'geoid_model', label: 'Geoid Model', placeholder: 'e.g. GEOID18' },
  { id: 'epoch', label: 'Epoch', placeholder: 'e.g. 2010.00' },
  { id: 'crs_epsg', label: 'CRS / EPSG', placeholder: 'e.g. EPSG:6346' },
];

export function DatumMetadata({ data, onChange, mode }: Props) {
  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <p className="rounded border-l-4 p-3 text-xs" style={{ borderColor: REPORT_COLORS.primary, background: REPORT_COLORS.bgCard, color: REPORT_COLORS.text }}>
          ITRF2014 (network RTK default) and NAD83(2011) differ by 1 to 2 m in absolute position. Record the datum, geoid, and epoch actually used by the processing chain; never assume.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <div key={f.id}>
              <Label>{f.label}</Label>
              <Input placeholder={f.placeholder} value={(data[f.id] as string) ?? ''} onChange={(e) => onChange({ ...data, [f.id]: e.target.value })} />
            </div>
          ))}
        </div>
        <div><Label>Notes</Label><Textarea rows={2} placeholder="e.g. base station source, transformation applied, known offsets" value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  const filled = FIELDS.filter((f) => ((data[f.id] as string) ?? '') !== '');

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Datum, Geoid & Epoch</h2>
      {/* No empty-state placeholder in preview/print: a client PDF never
          carries a dashed box (fully empty sections are omitted upstream). */}
      {filled.length > 0 && (
        <div className="rounded overflow-hidden" style={{ border: `1px solid ${REPORT_COLORS.border}` }}>
          {filled.map((f, i) => (
            <div key={f.id} className="flex text-sm" style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
              <div className="w-48 shrink-0 px-4 py-2 font-medium" style={{ color: REPORT_COLORS.textSecondary }}>{f.label}</div>
              <div className="px-4 py-2" style={{ color: REPORT_COLORS.text }}>{data[f.id] as string}</div>
            </div>
          ))}
        </div>
      )}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
