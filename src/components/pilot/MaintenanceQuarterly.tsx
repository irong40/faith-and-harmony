// Quarterly maintenance view across the fleet (Adam decision 2026-11-22 #0,
// part 2). Built on the existing aircraft + maintenance_log records. Flight
// activity (aircraft_flight_hours) is shown in its own labeled block and never
// counts as evidence that maintenance was done.
import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { CalendarRange } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageShell from '@/components/admin/PageShell';
import { LoadingState } from '@/components/admin/PageState';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAllAircraft } from '@/hooks/useFleet';
import {
  useCreateFlightHoursReading,
  useFleetMaintenanceLog,
  useFlightHoursReadings,
} from '@/hooks/useFlightHours';
import {
  buildFlightHoursPayload,
  parseFlightLogExport,
  quarterOf,
  summarizeAircraft,
  NO_MAINTENANCE,
  type AircraftQuarterSummary,
  type FlightHoursSource,
} from '@/lib/maintenanceQuarterly';

function AircraftQuarterCard({ s }: { s: AircraftQuarterSummary }) {
  const name = s.aircraft.nickname || s.aircraft.model;
  return (
    <Card data-testid="quarterly-aircraft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {name} <span className="text-xs text-muted-foreground">({s.aircraft.serial_number || 'serial unknown'})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Last service</div>
          <div>{s.lastService}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Open issues</div>
          {!s.hasHistory ? (
            <div>{NO_MAINTENANCE}</div>
          ) : s.openIssues.length ? (
            <ul className="list-disc pl-5">
              {s.openIssues.map((o, i) => (
                <li key={i}>{o.date}: {o.text}</li>
              ))}
            </ul>
          ) : (
            <div>none recorded</div>
          )}
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Upcoming service</div>
          {s.upcoming.length ? (
            <ul className="space-y-1">
              {s.upcoming.map((u, i) => (
                <li key={i} data-testid="upcoming-item">
                  {u.kind}{u.component ? ` (${u.component})` : ''} by {u.basis === 'flight hours' ? `${u.due} flight hours` : u.due}:{' '}
                  <Badge variant={u.status === 'overdue' ? 'destructive' : 'secondary'}>{u.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <div>{s.upcomingText}</div>
          )}
        </div>
        <div className="rounded border border-dashed p-2" data-testid="flight-activity">
          <div className="text-xs text-muted-foreground">
            Flight activity (not evidence of maintenance)
          </div>
          <div>{s.flightActivity}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const today = () => new Date();

export default function MaintenanceQuarterly() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Every aircraft except retired ones: a grounded or in-maintenance aircraft
  // is exactly the one whose overdue work and open issues must show here.
  const aircraftQ = useAllAircraft();
  const logQ = useFleetMaintenanceLog();
  const hoursQ = useFlightHoursReadings();
  const create = useCreateFlightHoursReading();

  const [aircraftId, setAircraftId] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [asOfDate, setAsOfDate] = useState('');
  const [sourceDetail, setSourceDetail] = useState('');
  const [source, setSource] = useState<FlightHoursSource>('manual');
  const [enteredByName, setEnteredByName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const now = today();
  const quarter = quarterOf(now);
  const fleet = useMemo(() => (aircraftQ.data ?? []).filter((a) => a.status !== 'retired'), [aircraftQ.data]);
  const summaries = useMemo(
    () =>
      fleet.map((a) =>
        summarizeAircraft(a, logQ.data ?? [], hoursQ.data ?? [], now)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fleet, logQ.data, hoursQ.data]
  );

  async function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = parseFlightLogExport(await file.text());
    if ('error' in parsed) {
      setErrors([parsed.error]);
      return;
    }
    const range = parsed.firstDate ? `, flights ${parsed.firstDate} to ${parsed.lastDate}` : '';
    setTotalHours(String(parsed.totalHours));
    if (parsed.lastDate) setAsOfDate(parsed.lastDate);
    setSource('export_import');
    setSourceDetail(`${file.name}: sum of ${parsed.flights} flights in the file (column "${parsed.column}")${range}`);
    setErrors([]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const r = buildFlightHoursPayload(
      { aircraftId, totalHours, asOfDate, source, sourceDetail, enteredByName },
      user?.id ?? null,
      new Date()
    );
    if ('errors' in r) {
      setErrors(r.errors);
      return;
    }
    setErrors([]);
    try {
      await create.mutateAsync(r.payload);
      toast({ title: 'Flight-hours reading saved' });
      setTotalHours('');
      setSourceDetail('');
      setSource('manual');
    } catch (err) {
      setErrors([`Not saved: ${(err as Error).message}`]);
    }
  }

  if (aircraftQ.isLoading || logQ.isLoading || hoursQ.isLoading) return <LoadingState />;
  const loadError = aircraftQ.error || logQ.error || hoursQ.error;

  return (
    <PageShell
      title={`Quarterly maintenance view: ${quarter.label}`}
      description={`Per aircraft: last service, open issues and upcoming service (${quarter.start} to ${quarter.end}). Flight activity is shown separately and is not evidence of maintenance.`}
      icon={CalendarRange}
      breadcrumbs={[
        { label: 'Settings', href: '/admin/settings' },
        { label: 'Fleet', href: '/admin/settings/fleet' },
        { label: 'Maintenance', href: '/admin/settings/fleet/maintenance' },
        { label: 'Quarterly' },
      ]}
    >
      {loadError ? (
        <p role="alert" className="text-sm text-destructive">Could not load: {(loadError as Error).message}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {summaries.length ? (
          summaries.map((s) => <AircraftQuarterCard key={s.aircraft.id} s={s} />)
        ) : (
          <p className="text-sm">No active aircraft on the fleet list.</p>
        )}
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Enter flight hours (manual entry or exported file)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2" aria-label="flight hours entry">
            <div>
              <Label htmlFor="fh-aircraft">Aircraft</Label>
              <select
                id="fh-aircraft"
                className="w-full rounded border bg-background p-2 text-sm"
                value={aircraftId}
                onChange={(e) => setAircraftId(e.target.value)}
              >
                <option value="">Choose…</option>
                {fleet.map((a) => (
                  <option key={a.id} value={a.id}>{a.nickname || a.model} ({a.serial_number || 'serial unknown'})</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="fh-file">Import an exported flight-log CSV (optional)</Label>
              <Input id="fh-file" type="file" accept=".csv,text/csv" onChange={onImport} />
            </div>
            <div>
              <Label htmlFor="fh-hours">Total flight hours</Label>
              <Input id="fh-hours" inputMode="decimal" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fh-date">As of date</Label>
              <Input id="fh-date" type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fh-detail">Source detail (where the number came from)</Label>
              <Input id="fh-detail" value={sourceDetail} onChange={(e) => setSourceDetail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="fh-who">Entered by</Label>
              <Input id="fh-who" value={enteredByName} onChange={(e) => setEnteredByName(e.target.value)} />
            </div>
            <div className="md:col-span-2 text-xs text-muted-foreground">
              Source: {source === 'export_import' ? 'imported export file' : 'manual entry'}. The date and time you save are stamped on the reading.
            </div>
            {errors.length ? (
              <ul role="alert" className="md:col-span-2 text-sm text-destructive list-disc pl-5">
                {errors.map((m) => <li key={m}>{m}</li>)}
              </ul>
            ) : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={create.isPending}>Save reading</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}
