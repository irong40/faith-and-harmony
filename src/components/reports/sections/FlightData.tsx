import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REPORT_COLORS } from '@/lib/brand';
import type { FlightDataData, FlightDataEntry, ReportImage } from '@/types/report';

interface Props {
  data: FlightDataData;
  onChange: (data: FlightDataData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const emptyFlight = (): FlightDataEntry => ({
  flight_number: 1, date: '', start_time: '', end_time: '', duration_minutes: 0,
  altitude_agl: 0, area_covered_acres: 0, photo_count: 0,
});

export function FlightData({ data, onChange, mode }: Props) {
  const flights = data.flights ?? [];

  const updateFlight = (i: number, patch: Partial<FlightDataEntry>) => {
    const n = [...flights]; n[i] = { ...n[i], ...patch }; onChange({ ...data, flights: n });
  };

  if (mode === 'edit') {
    return (
      <div className="space-y-4">
        {flights.map((f, i) => (
          <div key={i} className="border rounded p-3 space-y-2">
            <div className="flex justify-between items-center">
              <Label>Flight #{f.flight_number}</Label>
              <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, flights: flights.filter((_, j) => j !== i) })}>Remove</Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Date</Label><Input type="date" value={f.date} onChange={(e) => updateFlight(i, { date: e.target.value })} /></div>
              <div><Label className="text-xs">Start</Label><Input type="time" value={f.start_time ?? ''} onChange={(e) => updateFlight(i, { start_time: e.target.value })} /></div>
              <div><Label className="text-xs">End</Label><Input type="time" value={f.end_time ?? ''} onChange={(e) => updateFlight(i, { end_time: e.target.value })} /></div>
              <div><Label className="text-xs">Duration (min)</Label><Input type="number" value={f.duration_minutes ?? ''} onChange={(e) => updateFlight(i, { duration_minutes: +e.target.value })} /></div>
              <div><Label className="text-xs">Altitude AGL</Label><Input type="number" value={f.altitude_agl ?? ''} onChange={(e) => updateFlight(i, { altitude_agl: +e.target.value })} /></div>
              <div><Label className="text-xs">Area (acres)</Label><Input type="number" value={f.area_covered_acres ?? ''} onChange={(e) => updateFlight(i, { area_covered_acres: +e.target.value })} /></div>
              <div><Label className="text-xs">Photos</Label><Input type="number" value={f.photo_count ?? ''} onChange={(e) => updateFlight(i, { photo_count: +e.target.value })} /></div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, flights: [...flights, { ...emptyFlight(), flight_number: flights.length + 1 }] })}>Add Flight</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Flight Data</h2>
      <Table>
        <TableHeader>
          <TableRow style={{ background: REPORT_COLORS.tableHeader }}>
            {['#', 'Date', 'Time', 'Duration', 'Alt (ft)', 'Area (ac)', 'Photos'].map((h) => (
              <TableHead key={h} style={{ color: REPORT_COLORS.tableHeaderText }}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {flights.map((f, i) => (
            <TableRow key={i} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
              <TableCell>{f.flight_number}</TableCell>
              <TableCell>{f.date}</TableCell>
              <TableCell>{f.start_time}{f.end_time ? ` - ${f.end_time}` : ''}</TableCell>
              <TableCell>{f.duration_minutes} min</TableCell>
              <TableCell>{f.altitude_agl}</TableCell>
              <TableCell>{f.area_covered_acres}</TableCell>
              <TableCell>{f.photo_count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.total_area_acres && <p className="text-xs" style={{ color: REPORT_COLORS.textSecondary }}>Total area: {data.total_area_acres} acres | Flights: {flights.length} | Photos: {data.total_photos ?? '---'}</p>}
    </div>
  );
}
