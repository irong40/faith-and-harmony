import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { VolumetricEntry, VolumetricsData, ReportImage } from '@/types/report';

interface Props {
  data: VolumetricsData;
  onChange: (data: VolumetricsData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const emptyMeasurement = (): VolumetricEntry => ({ name: '', type: 'stockpile', value: 0, unit: 'cu yd' });

export function Volumetrics({ data, onChange, mode }: Props) {
  const measurements = data.measurements ?? [];

  const update = (i: number, patch: Partial<VolumetricEntry>) => {
    const n = [...measurements]; n[i] = { ...n[i], ...patch }; onChange({ ...data, measurements: n });
  };

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Reference Surface</Label><Input value={data.reference_surface ?? ''} onChange={(e) => onChange({ ...data, reference_surface: e.target.value })} /></div>
          <div><Label>Datum</Label><Input value={data.datum ?? ''} onChange={(e) => onChange({ ...data, datum: e.target.value })} /></div>
        </div>
        {measurements.map((m, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Name</Label><Input value={m.name} onChange={(e) => update(i, { name: e.target.value })} /></div>
            <div className="w-28">
              <Label className="text-xs">Type</Label>
              <select className="w-full rounded border px-2 py-1.5 text-sm" value={m.type} onChange={(e) => update(i, { type: e.target.value as VolumetricEntry['type'] })}>
                {['cut', 'fill', 'stockpile', 'area'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="w-24"><Label className="text-xs">Value</Label><Input type="number" value={m.value} onChange={(e) => update(i, { value: +e.target.value })} /></div>
            <div className="w-24"><Label className="text-xs">Unit</Label><Input value={m.unit} onChange={(e) => update(i, { unit: e.target.value })} /></div>
            <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, measurements: measurements.filter((_, j) => j !== i) })}>Remove</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, measurements: [...measurements, emptyMeasurement()] })}>Add Measurement</Button>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Volumetric Measurements</h2>
      <Table>
        <TableHeader>
          <TableRow style={{ background: REPORT_COLORS.tableHeader }}>
            {['Name', 'Type', 'Value', 'Unit'].map((h) => (
              <TableHead key={h} style={{ color: REPORT_COLORS.tableHeaderText }}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {measurements.map((m, i) => (
            <TableRow key={i} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
              <TableCell className="font-medium">{m.name}</TableCell>
              <TableCell className="capitalize">{m.type}</TableCell>
              <TableCell>{m.value.toLocaleString()}</TableCell>
              <TableCell>{m.unit}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.reference_surface && <p className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>Reference: {data.reference_surface}{data.datum ? ` | Datum: ${data.datum}` : ''}</p>}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
