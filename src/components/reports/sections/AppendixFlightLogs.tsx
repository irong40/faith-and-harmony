import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { AppendixFlightLogsData, FlightLogEntry, ReportImage } from '@/types/report';

interface Props {
  data: AppendixFlightLogsData;
  onChange: (data: AppendixFlightLogsData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const emptyLog = (): FlightLogEntry => ({ flight_number: 1 });

export function AppendixFlightLogs({ data, onChange, mode }: Props) {
  const logs = data.logs ?? [];

  const update = (i: number, patch: Partial<FlightLogEntry>) => {
    const n = [...logs]; n[i] = { ...n[i], ...patch }; onChange({ ...data, logs: n });
  };

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div><Label>AirData Profile URL</Label><Input value={data.airdata_profile_url ?? ''} onChange={(e) => onChange({ ...data, airdata_profile_url: e.target.value })} /></div>
        {logs.map((l, i) => (
          <div key={i} className="border rounded p-3 space-y-2">
            <div className="flex justify-between"><Label>Log #{l.flight_number}</Label><Button variant="destructive" size="sm" onClick={() => onChange({ ...data, logs: logs.filter((_, j) => j !== i) })}>Remove</Button></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Duration</Label><Input value={l.duration ?? ''} onChange={(e) => update(i, { duration: e.target.value })} /></div>
              <div><Label className="text-xs">Max Altitude</Label><Input value={l.max_altitude ?? ''} onChange={(e) => update(i, { max_altitude: e.target.value })} /></div>
              <div><Label className="text-xs">Max Distance</Label><Input value={l.max_distance ?? ''} onChange={(e) => update(i, { max_distance: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">AirData URL</Label><Input value={l.airdata_url ?? ''} onChange={(e) => update(i, { airdata_url: e.target.value })} /></div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, logs: [...logs, { ...emptyLog(), flight_number: logs.length + 1 }] })}>Add Log</Button>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Appendix: Flight Logs</h2>
      <Table>
        <TableHeader>
          <TableRow style={{ background: REPORT_COLORS.tableHeader }}>
            {['Flight', 'Duration', 'Max Alt', 'Max Dist', 'AirData'].map((h) => (
              <TableHead key={h} style={{ color: REPORT_COLORS.tableHeaderText }}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((l, i) => (
            <TableRow key={i} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
              <TableCell>#{l.flight_number}</TableCell>
              <TableCell>{l.duration ?? '---'}</TableCell>
              <TableCell>{l.max_altitude ?? '---'}</TableCell>
              <TableCell>{l.max_distance ?? '---'}</TableCell>
              <TableCell>{l.airdata_url ? <a href={l.airdata_url} target="_blank" rel="noreferrer" style={{ color: REPORT_COLORS.primary }}>View</a> : '---'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.airdata_profile_url && <p className="text-xs"><a href={data.airdata_profile_url} target="_blank" rel="noreferrer" style={{ color: REPORT_COLORS.primary }}>AirData Profile</a></p>}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
