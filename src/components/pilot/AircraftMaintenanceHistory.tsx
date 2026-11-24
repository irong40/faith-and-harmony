import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageShell from '@/components/admin/PageShell';
import { LoadingState } from '@/components/admin/PageState';
import { useToast } from '@/hooks/use-toast';
import {
  useAircraftMaintenanceHistory,
  useAircraftRecord,
  useCreateAircraftMaintenanceRecord,
} from '@/hooks/useAircraftMaintenance';
import {
  eventTypeLabel,
  formatFlightHours,
  formatNextDue,
  orUnknown,
} from '@/lib/maintenanceRecord';
import type { MaintenanceLogEntry } from '@/types/fleet';
import AircraftMaintenanceForm from './AircraftMaintenanceForm';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap break-words">{value}</dd>
    </div>
  );
}

function HistoryEntry({ entry }: { entry: MaintenanceLogEntry }) {
  const evidence = entry.evidence_url?.trim();
  return (
    <Card data-testid="maintenance-entry">
      <CardContent className="pt-3 pb-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{eventTypeLabel(entry.maintenance_type)}</Badge>
            <span className="text-sm font-medium">{entry.performed_at.slice(0, 10)}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {entry.component_id?.trim() ? `Component ${entry.component_id}` : 'Airframe'}
          </span>
        </div>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Field label="Flight hours at service" value={formatFlightHours(entry.flight_hours_at_service)} />
          <Field label="Performed by" value={orUnknown(entry.performed_by_name)} />
          <Field label="Work performed" value={orUnknown(entry.description)} />
          <Field label="Results" value={orUnknown(entry.results)} />
          <Field label="Open issues" value={orUnknown(entry.open_issues, 'none recorded')} />
          <Field
            label="Next due"
            value={formatNextDue({
              next_due_date: entry.next_due_date,
              next_due_flight_hours: entry.next_due_flight_hours ?? null,
            })}
          />
          <div>
            <dt className="text-xs text-muted-foreground">Evidence</dt>
            <dd className="text-sm break-all">
              {evidence ? (
                /^https?:\/\//i.test(evidence) ? (
                  <a href={evidence} target="_blank" rel="noopener noreferrer" className="underline">
                    {evidence}
                  </a>
                ) : (
                  evidence
                )
              ) : (
                'none on file'
              )}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Per-aircraft maintenance history and entry form, in the admin shell at
 * /admin/settings/fleet/aircraft/:aircraftId/maintenance. Reads the existing
 * aircraft row and its maintenance_log rows; TEST rows are excluded.
 */
export default function AircraftMaintenanceHistory() {
  const { aircraftId } = useParams<{ aircraftId: string }>();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const aircraftQ = useAircraftRecord(aircraftId);
  const historyQ = useAircraftMaintenanceHistory(aircraftId);
  const create = useCreateAircraftMaintenanceRecord();

  const aircraft = aircraftQ.data;
  const name = aircraft ? aircraft.nickname || `${aircraft.model} ${aircraft.serial_number}` : 'Aircraft';
  const entries = historyQ.data ?? [];

  const handleSubmit = async (payload: Parameters<typeof create.mutateAsync>[0]) => {
    await create.mutateAsync(payload);
    toast({ title: 'Maintenance record saved' });
    setShowForm(false);
  };

  return (
    <PageShell
      title={`${name}: maintenance history`}
      description="Dated maintenance record for this aircraft. Unknown values are shown as unknown."
      icon={Wrench}
      breadcrumbs={[
        { label: 'Settings', href: '/admin/settings' },
        { label: 'Fleet', href: '/admin/settings/fleet' },
        { label: 'Maintenance', href: '/admin/settings/fleet/maintenance' },
        { label: name },
      ]}
      width="default"
      actions={
        <div className="flex gap-2">
          <Link to="/admin/settings/fleet">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Fleet
            </Button>
          </Link>
          {aircraft && !showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add record
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {aircraftQ.isLoading ? (
          <LoadingState variant="list" rows={3} label="Loading aircraft" />
        ) : !aircraft ? (
          <p className="text-sm text-muted-foreground">
            No aircraft with this ID is on the fleet list.
          </p>
        ) : (
          <>
            <Card>
              <CardContent className="pt-4">
                <dl className="grid gap-2 sm:grid-cols-4">
                  <Field label="Model" value={aircraft.model} />
                  <Field label="Serial number" value={aircraft.serial_number} />
                  <Field label="FAA registration" value={orUnknown(aircraft.faa_registration)} />
                  <Field label="Status" value={aircraft.status} />
                </dl>
              </CardContent>
            </Card>

            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">New maintenance record</CardTitle>
                </CardHeader>
                <CardContent>
                  <AircraftMaintenanceForm
                    aircraftId={aircraft.id}
                    onSubmit={handleSubmit}
                    onCancel={() => setShowForm(false)}
                    allowTestRows={import.meta.env.DEV}
                  />
                </CardContent>
              </Card>
            )}

            {historyQ.isLoading ? (
              <LoadingState variant="list" rows={4} label="Loading maintenance history" />
            ) : historyQ.isError ? (
              <p role="alert" className="text-sm text-destructive">
                Could not load the maintenance history.
              </p>
            ) : entries.length === 0 ? (
              <div className="text-center py-10">
                <Wrench className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No maintenance records for this aircraft yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map(e => (
                  <HistoryEntry key={e.id} entry={e} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
