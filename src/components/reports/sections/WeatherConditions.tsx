import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { WeatherData, ReportImage } from '@/types/report';

interface Props {
  data: WeatherData;
  onChange: (data: WeatherData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function WeatherConditions({ data, onChange, mode }: Props) {
  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Temp (F)</Label><Input type="number" value={data.temperature_f ?? ''} onChange={(e) => onChange({ ...data, temperature_f: +e.target.value })} /></div>
          <div><Label>Wind (mph)</Label><Input type="number" value={data.wind_speed_mph ?? ''} onChange={(e) => onChange({ ...data, wind_speed_mph: +e.target.value })} /></div>
          <div><Label>Wind Direction</Label><Input value={data.wind_direction ?? ''} onChange={(e) => onChange({ ...data, wind_direction: e.target.value })} /></div>
          <div><Label>Gusts (mph)</Label><Input type="number" value={data.wind_gusts_mph ?? ''} onChange={(e) => onChange({ ...data, wind_gusts_mph: +e.target.value })} /></div>
          <div><Label>Cloud Cover</Label><Input value={data.cloud_cover ?? ''} onChange={(e) => onChange({ ...data, cloud_cover: e.target.value })} /></div>
          <div><Label>Visibility</Label><Input value={data.visibility ?? ''} onChange={(e) => onChange({ ...data, visibility: e.target.value })} /></div>
          <div><Label>Precipitation</Label><Input value={data.precipitation ?? ''} onChange={(e) => onChange({ ...data, precipitation: e.target.value })} /></div>
          <div><Label>Station</Label><Input value={data.station ?? ''} onChange={(e) => onChange({ ...data, station: e.target.value })} /></div>
        </div>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  const items = [
    data.temperature_f != null ? ['Temperature', `${data.temperature_f}°F`] : null,
    data.wind_speed_mph != null ? ['Wind', `${data.wind_speed_mph} mph ${data.wind_direction ?? ''}${data.wind_gusts_mph ? ` (gusts ${data.wind_gusts_mph} mph)` : ''}`] : null,
    data.cloud_cover ? ['Cloud Cover', data.cloud_cover] : null,
    data.visibility ? ['Visibility', data.visibility] : null,
    data.precipitation ? ['Precipitation', data.precipitation] : null,
    data.station ? ['Station', data.station] : null,
  ].filter(Boolean) as string[][];

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Weather Conditions</h2>
      <div className="rounded-lg p-4" style={{ background: REPORT_COLORS.bgCard, border: `1px solid ${REPORT_COLORS.border}` }}>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {items.map(([label, value], i) => (
            <div key={i}>
              <span className="font-semibold" style={{ color: REPORT_COLORS.heading }}>{label}: </span>
              <span style={{ color: REPORT_COLORS.textSecondary }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
