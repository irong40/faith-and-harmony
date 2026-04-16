import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { EquipmentData, ReportImage } from '@/types/report';

interface Props {
  data: EquipmentData;
  onChange: (data: EquipmentData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function Equipment({ data, onChange, mode }: Props) {
  const sensors = data.additional_sensors ?? [];

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div><Label>Aircraft Name</Label><Input value={data.aircraft_name} onChange={(e) => onChange({ ...data, aircraft_name: e.target.value })} /></div>
        <div><Label>Aircraft Model</Label><Input value={data.aircraft_model ?? ''} onChange={(e) => onChange({ ...data, aircraft_model: e.target.value })} /></div>
        <div><Label>Camera</Label><Input value={data.camera ?? ''} onChange={(e) => onChange({ ...data, camera: e.target.value })} /></div>
        <div><Label>Sensor Specs</Label><Input value={data.sensor_specs ?? ''} onChange={(e) => onChange({ ...data, sensor_specs: e.target.value })} /></div>
        <div className="flex items-center gap-2">
          <Label>RTK Enabled</Label>
          <Switch checked={data.rtk_enabled ?? false} onCheckedChange={(v) => onChange({ ...data, rtk_enabled: v })} />
        </div>
        <div>
          <Label>Additional Sensors</Label>
          {sensors.map((s, i) => (
            <div key={i} className="flex gap-2 mt-1">
              <Input value={s} onChange={(e) => { const n = [...sensors]; n[i] = e.target.value; onChange({ ...data, additional_sensors: n }); }} />
              <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, additional_sensors: sensors.filter((_, j) => j !== i) })}>Remove</Button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="mt-1" onClick={() => onChange({ ...data, additional_sensors: [...sensors, ''] })}>Add Sensor</Button>
        </div>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  const rows = [
    ['Aircraft', `${data.aircraft_name}${data.aircraft_model ? ` (${data.aircraft_model})` : ''}`],
    data.camera ? ['Camera', data.camera] : null,
    data.sensor_specs ? ['Sensor', data.sensor_specs] : null,
    ['RTK', data.rtk_enabled ? 'Enabled' : 'Disabled'],
    ...sensors.map((s, i) => [`Sensor ${i + 1}`, s]),
  ].filter(Boolean) as string[][];

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Equipment</h2>
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([label, value], i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
              <td className="px-3 py-2 font-semibold w-1/3" style={{ color: REPORT_COLORS.heading }}>{label}</td>
              <td className="px-3 py-2" style={{ color: REPORT_COLORS.textSecondary }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
