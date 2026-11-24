// Print / PDF view of one aircraft's maintenance record on the Sentinel Aerial
// Inspections letterhead (Adam decision 2026-11-22 #0, part 3). The document is
// built by buildMaintenanceRecordHtml and shown in an iframe; "Print / Save as
// PDF" prints only that iframe, on US Letter. It is a maintenance record, not a
// certification.
import { useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageShell from '@/components/admin/PageShell';
import { LoadingState } from '@/components/admin/PageState';
import { useAircraftMaintenanceHistory, useAircraftRecord } from '@/hooks/useAircraftMaintenance';
import { buildMaintenanceRecordHtml, RECORD_TITLE } from '@/lib/maintenanceRecordPrint';

const CREST_SRC = '/assets/brand/sai-crest.png';
const ymd = (d: Date) => d.toISOString().slice(0, 10);

export default function AircraftMaintenanceRecordPrint() {
  const { aircraftId } = useParams<{ aircraftId: string }>();
  const aircraftQ = useAircraftRecord(aircraftId);
  const historyQ = useAircraftMaintenanceHistory(aircraftId);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const today = new Date();
  const [from, setFrom] = useState(`${today.getFullYear()}-01-01`);
  const [to, setTo] = useState(ymd(today));
  const periodOk = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to;

  const aircraft = aircraftQ.data ?? null;
  const html = useMemo(() => {
    if (!aircraft || !periodOk) return '';
    return buildMaintenanceRecordHtml({
      aircraft,
      entries: historyQ.data ?? [],
      period: { from, to },
      generatedOn: ymd(new Date()),
      crestSrc: `${window.location.origin}${CREST_SRC}`,
    });
  }, [aircraft, historyQ.data, from, to, periodOk]);

  const name = aircraft ? aircraft.nickname || aircraft.model : 'Aircraft';
  const historyHref = `/admin/settings/fleet/aircraft/${aircraftId}/maintenance`;

  return (
    <PageShell
      title={`${RECORD_TITLE}: ${name}`}
      description="Print or save as PDF on the Sentinel Aerial Inspections letterhead. A maintenance record, not a certification."
      breadcrumbs={[
        { label: 'Settings', href: '/admin/settings' },
        { label: 'Fleet', href: '/admin/settings/fleet' },
        { label: name, href: historyHref },
        { label: 'Print record' },
      ]}
      width="default"
      actions={
        <div className="flex gap-2">
          <Link to={historyHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to history
            </Button>
          </Link>
          <Button
            size="sm"
            disabled={!html || historyQ.isLoading}
            onClick={() => frameRef.current?.contentWindow?.print()}
          >
            <Printer className="h-4 w-4 mr-1" /> Print / Save as PDF
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="period-from">Reporting period from</Label>
            <Input id="period-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="period-to">to</Label>
            <Input id="period-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {!periodOk && <p className="text-sm text-destructive">Choose a start date on or before the end date.</p>}
        </div>
        {aircraftQ.isLoading || historyQ.isLoading ? (
          <LoadingState variant="list" rows={3} label="Loading maintenance record" />
        ) : !aircraft ? (
          <p className="text-sm text-muted-foreground">Aircraft not found.</p>
        ) : historyQ.isError ? (
          <p className="text-sm text-destructive">Could not load the maintenance history, so no record is shown.</p>
        ) : (
          <iframe
            ref={frameRef}
            title={`${RECORD_TITLE} preview`}
            srcDoc={html}
            className="w-full border rounded bg-white"
            style={{ height: '11in' }}
          />
        )}
      </div>
    </PageShell>
  );
}
