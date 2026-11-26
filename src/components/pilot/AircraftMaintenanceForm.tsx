import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import {
  EMPTY_MAINTENANCE_FORM,
  MAINTENANCE_EVENT_TYPES,
  buildMaintenancePayload,
  eventTypeLabel,
  type MaintenanceFormValues,
  type MaintenanceInsertPayload,
} from '@/lib/maintenanceRecord';

interface AircraftMaintenanceFormProps {
  aircraftId: string;
  onSubmit: (payload: MaintenanceInsertPayload) => Promise<unknown>;
  onCancel?: () => void;
  /** Show the TEST-row checkbox. Only for dev/staging builds. */
  allowTestRows?: boolean;
}

type Errors = Partial<Record<keyof MaintenanceFormValues, string>>;

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * Entry form for one maintenance event on one aircraft. Nothing is pre-filled:
 * the date must be entered and every blank optional field is saved as unknown
 * (NULL), never as 0 or today.
 */
export default function AircraftMaintenanceForm({
  aircraftId,
  onSubmit,
  onCancel,
  allowTestRows = false,
}: AircraftMaintenanceFormProps) {
  const [form, setForm] = useState<MaintenanceFormValues>({
    ...EMPTY_MAINTENANCE_FORM,
    aircraft_id: aircraftId,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof MaintenanceFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const result = buildMaintenancePayload(form);
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await onSubmit(result.payload);
      setForm({ ...EMPTY_MAINTENANCE_FORM, aircraft_id: aircraftId });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save the record.');
    } finally {
      setSaving(false);
    }
  };

  const err = (key: keyof MaintenanceFormValues) =>
    errors[key] ? (
      <p role="alert" className="text-xs text-destructive mt-1">{errors[key]}</p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3" aria-label="Maintenance entry">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="mx-type" className="text-xs">Event type *</Label>
          <select id="mx-type" className={SELECT_CLASS} value={form.maintenance_type} onChange={set('maintenance_type')}>
            <option value="">Choose…</option>
            {MAINTENANCE_EVENT_TYPES.map(t => (
              <option key={t} value={t}>{eventTypeLabel(t)}</option>
            ))}
          </select>
          {err('maintenance_type')}
        </div>
        <div>
          <Label htmlFor="mx-date" className="text-xs">Date performed *</Label>
          <Input id="mx-date" type="date" value={form.performed_at} onChange={set('performed_at')} />
          {err('performed_at')}
        </div>
        <div>
          <Label htmlFor="mx-component" className="text-xs">Component ID (blank = airframe)</Label>
          <Input id="mx-component" value={form.component_id} onChange={set('component_id')} placeholder="Battery serial, prop set…" />
        </div>
        <div>
          <Label htmlFor="mx-hours" className="text-xs">Flight hours at service (blank = unknown)</Label>
          <Input id="mx-hours" inputMode="decimal" value={form.flight_hours_at_service} onChange={set('flight_hours_at_service')} />
          {err('flight_hours_at_service')}
        </div>
      </div>

      <div>
        <Label htmlFor="mx-work" className="text-xs">Work performed *</Label>
        <Textarea id="mx-work" rows={2} value={form.description} onChange={set('description')} />
        {err('description')}
      </div>
      <div>
        <Label htmlFor="mx-results" className="text-xs">Results</Label>
        <Textarea id="mx-results" rows={2} value={form.results} onChange={set('results')} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="mx-by" className="text-xs">Performed by</Label>
          <Input id="mx-by" value={form.performed_by_name} onChange={set('performed_by_name')} />
        </div>
        <div>
          <Label htmlFor="mx-evidence" className="text-xs">Evidence (link or file path)</Label>
          <Input id="mx-evidence" value={form.evidence_url} onChange={set('evidence_url')} placeholder="Receipt, service order, photo" />
        </div>
      </div>

      <div>
        <Label htmlFor="mx-issues" className="text-xs">Open issues</Label>
        <Textarea id="mx-issues" rows={2} value={form.open_issues} onChange={set('open_issues')} />
        <p className="mt-1 text-xs text-muted-foreground">
          List every issue still open on this component. This entry replaces the open issues of earlier entries for
          the same component; leave it blank when they are fixed.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="mx-due-date" className="text-xs">Next due date</Label>
          <Input id="mx-due-date" type="date" value={form.next_due_date} onChange={set('next_due_date')} />
          {err('next_due_date')}
        </div>
        <div>
          <Label htmlFor="mx-due-hours" className="text-xs">Next due at flight hours</Label>
          <Input id="mx-due-hours" inputMode="decimal" value={form.next_due_flight_hours} onChange={set('next_due_flight_hours')} />
          {err('next_due_flight_hours')}
        </div>
      </div>

      {allowTestRows && (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.is_test}
            onChange={e => setForm(f => ({ ...f, is_test: e.target.checked }))}
          />
          TEST row (dev/staging only; hidden from the live history)
        </label>
      )}

      {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Save record
        </Button>
      </div>
    </form>
  );
}
