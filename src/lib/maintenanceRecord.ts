// Aircraft maintenance history helpers (Adam decision 2026-11-22 #0).
// Pure functions so the history page, the entry form, and later the quarterly
// and print views all show unknown values the same way: explicitly, never as
// a made-up number.

export const MAINTENANCE_EVENT_TYPES = [
  'inspection',
  'service',
  'repair',
  'part_replacement',
  'battery_replacement',
] as const;

export type MaintenanceEventType = (typeof MAINTENANCE_EVENT_TYPES)[number];

export const EVENT_TYPE_LABEL: Record<string, string> = {
  inspection: 'Inspection',
  service: 'Service',
  repair: 'Repair',
  part_replacement: 'Part replacement',
  battery_replacement: 'Battery replacement',
  // Legacy enum values from the original fleet_management migration.
  scheduled: 'Scheduled',
  unscheduled: 'Unscheduled',
  firmware_update: 'Firmware update',
  calibration: 'Calibration',
};

export const UNKNOWN = 'unknown';

export function eventTypeLabel(type: string): string {
  return EVENT_TYPE_LABEL[type] ?? type.replace(/_/g, ' ');
}

/** Flight hours for display. null/undefined -> "unknown"; 0 stays "0.0 h". */
export function formatFlightHours(hours: number | string | null | undefined): string {
  if (hours === null || hours === undefined || hours === '') return UNKNOWN;
  const n = typeof hours === 'number' ? hours : Number(hours);
  if (!Number.isFinite(n)) return UNKNOWN;
  return `${n.toFixed(1)} h`;
}

/** Any optional text field for display. Empty -> "unknown" (or a given fallback). */
export function orUnknown(value: string | null | undefined, fallback: string = UNKNOWN): string {
  const v = value?.trim();
  return v ? v : fallback;
}

export interface NextDueInput {
  next_due_date: string | null;
  next_due_flight_hours: number | string | null;
}

/** "2027-01-15 or 50.0 h", "2027-01-15", "50.0 h", or "not set". */
export function formatNextDue(entry: NextDueInput): string {
  const parts: string[] = [];
  if (entry.next_due_date) parts.push(entry.next_due_date.slice(0, 10));
  const hrs = entry.next_due_flight_hours;
  if (hrs !== null && hrs !== undefined && hrs !== '' && Number.isFinite(Number(hrs))) {
    parts.push(`${Number(hrs).toFixed(1)} h`);
  }
  return parts.length ? parts.join(' or ') : 'not set';
}

export interface MaintenanceFormValues {
  aircraft_id: string;
  maintenance_type: string;
  performed_at: string; // YYYY-MM-DD, required: no silent "today" default
  component_id: string;
  flight_hours_at_service: string; // blank = unknown
  description: string; // work performed
  results: string;
  performed_by_name: string;
  evidence_url: string;
  open_issues: string;
  next_due_date: string;
  next_due_flight_hours: string;
  is_test: boolean;
}

export interface MaintenanceInsertPayload {
  equipment_type: 'aircraft';
  equipment_id: string;
  aircraft_id: string;
  maintenance_type: MaintenanceEventType;
  performed_at: string;
  component_id: string | null;
  flight_hours_at_service: number | null;
  description: string;
  results: string | null;
  performed_by_name: string | null;
  evidence_url: string | null;
  open_issues: string | null;
  next_due_date: string | null;
  next_due_flight_hours: number | null;
  is_test: boolean;
}

export type ValidationResult =
  | { ok: true; payload: MaintenanceInsertPayload }
  | { ok: false; errors: Partial<Record<keyof MaintenanceFormValues, string>> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function blankToNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

function parseHours(v: string): number | null | 'invalid' {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n >= 1_000_000) return 'invalid';
  return Math.round(n * 100) / 100;
}

/**
 * Validate the entry form and build the insert payload. Blank optional fields
 * become NULL (unknown), never 0 or today's date.
 */
export function buildMaintenancePayload(v: MaintenanceFormValues): ValidationResult {
  const errors: Partial<Record<keyof MaintenanceFormValues, string>> = {};

  if (!v.aircraft_id.trim()) errors.aircraft_id = 'Choose the aircraft.';
  if (!(MAINTENANCE_EVENT_TYPES as readonly string[]).includes(v.maintenance_type)) {
    errors.maintenance_type = 'Choose an event type.';
  }
  if (!DATE_RE.test(v.performed_at.trim())) errors.performed_at = 'Enter the date the work was done.';
  if (!v.description.trim()) errors.description = 'Describe the work performed.';

  const hours = parseHours(v.flight_hours_at_service);
  if (hours === 'invalid') errors.flight_hours_at_service = 'Hours must be a number of 0 or more, or blank if unknown.';
  const dueHours = parseHours(v.next_due_flight_hours);
  if (dueHours === 'invalid') errors.next_due_flight_hours = 'Hours must be a number of 0 or more, or blank.';
  const dueDate = v.next_due_date.trim();
  if (dueDate && !DATE_RE.test(dueDate)) errors.next_due_date = 'Use a full date, or leave blank.';

  if (Object.keys(errors).length) return { ok: false, errors };

  const aircraftId = v.aircraft_id.trim();
  return {
    ok: true,
    payload: {
      equipment_type: 'aircraft',
      equipment_id: aircraftId,
      aircraft_id: aircraftId,
      maintenance_type: v.maintenance_type as MaintenanceEventType,
      // Noon UTC keeps the chosen calendar day in every US timezone.
      performed_at: `${v.performed_at.trim()}T12:00:00Z`,
      component_id: blankToNull(v.component_id),
      flight_hours_at_service: hours as number | null,
      description: v.description.trim(),
      results: blankToNull(v.results),
      performed_by_name: blankToNull(v.performed_by_name),
      evidence_url: blankToNull(v.evidence_url),
      open_issues: blankToNull(v.open_issues),
      next_due_date: dueDate || null,
      next_due_flight_hours: dueHours as number | null,
      is_test: v.is_test,
    },
  };
}

export const EMPTY_MAINTENANCE_FORM: MaintenanceFormValues = {
  aircraft_id: '',
  maintenance_type: '',
  performed_at: '',
  component_id: '',
  flight_hours_at_service: '',
  description: '',
  results: '',
  performed_by_name: '',
  evidence_url: '',
  open_issues: '',
  next_due_date: '',
  next_due_flight_hours: '',
  is_test: false,
};
