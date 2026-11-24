import { describe, it, expect } from 'vitest';
import {
  buildMaintenancePayload,
  EMPTY_MAINTENANCE_FORM,
  formatFlightHours,
  formatNextDue,
  orUnknown,
  eventTypeLabel,
  MAINTENANCE_EVENT_TYPES,
  type MaintenanceFormValues,
  type ValidationResult,
} from './maintenanceRecord';

const AIRCRAFT = '00000000-0000-0000-0000-0000000000a1';

function form(over: Partial<MaintenanceFormValues> = {}): MaintenanceFormValues {
  return {
    ...EMPTY_MAINTENANCE_FORM,
    aircraft_id: AIRCRAFT,
    maintenance_type: 'inspection',
    performed_at: '2026-11-24',
    description: 'TEST pre-flight inspection',
    ...over,
  };
}

describe('formatFlightHours', () => {
  it('shows unknown for null, undefined, blank and non-numeric', () => {
    expect(formatFlightHours(null)).toBe('unknown');
    expect(formatFlightHours(undefined)).toBe('unknown');
    expect(formatFlightHours('')).toBe('unknown');
    expect(formatFlightHours('abc')).toBe('unknown');
  });
  it('keeps a real zero as zero, not unknown', () => {
    expect(formatFlightHours(0)).toBe('0.0 h');
  });
  it('formats numeric strings from Postgres NUMERIC', () => {
    expect(formatFlightHours('27.10')).toBe('27.1 h');
  });
});

describe('orUnknown / formatNextDue / eventTypeLabel', () => {
  it('orUnknown maps blank to unknown', () => {
    expect(orUnknown(null)).toBe('unknown');
    expect(orUnknown('   ')).toBe('unknown');
    expect(orUnknown('Camrise')).toBe('Camrise');
    expect(orUnknown(null, 'none recorded')).toBe('none recorded');
  });
  it('formatNextDue joins date and hours, else not set', () => {
    expect(formatNextDue({ next_due_date: null, next_due_flight_hours: null })).toBe('not set');
    expect(formatNextDue({ next_due_date: '2027-01-15', next_due_flight_hours: null })).toBe('2027-01-15');
    expect(formatNextDue({ next_due_date: null, next_due_flight_hours: '50' })).toBe('50.0 h');
    expect(formatNextDue({ next_due_date: '2027-01-15', next_due_flight_hours: 50 })).toBe('2027-01-15 or 50.0 h');
  });
  it('labels all five event types Adam named', () => {
    expect(MAINTENANCE_EVENT_TYPES.map(eventTypeLabel)).toEqual([
      'Inspection', 'Service', 'Repair', 'Part replacement', 'Battery replacement',
    ]);
  });
});

describe('buildMaintenancePayload', () => {
  it('blank optional fields become NULL, never 0 or a made-up value', () => {
    const r = buildMaintenancePayload(form());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.flight_hours_at_service).toBeNull();
    expect(r.payload.next_due_flight_hours).toBeNull();
    expect(r.payload.next_due_date).toBeNull();
    expect(r.payload.performed_by_name).toBeNull();
    expect(r.payload.evidence_url).toBeNull();
    expect(r.payload.open_issues).toBeNull();
    expect(r.payload.results).toBeNull();
    expect(r.payload.component_id).toBeNull();
    expect(r.payload.is_test).toBe(false);
  });
  it('links the event to the aircraft record by its id', () => {
    const r = buildMaintenancePayload(form());
    if (!r.ok) throw new Error('expected ok');
    expect(r.payload.aircraft_id).toBe(AIRCRAFT);
    expect(r.payload.equipment_id).toBe(AIRCRAFT);
    expect(r.payload.equipment_type).toBe('aircraft');
  });
  it('requires the date: no silent today default', () => {
    const r = buildMaintenancePayload(form({ performed_at: '' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const { errors } = r as Extract<ValidationResult, { ok: false }>;
    expect(errors.performed_at).toBeTruthy();
  });
  it('requires aircraft, event type and work performed', () => {
    const r = buildMaintenancePayload(form({ aircraft_id: '', maintenance_type: 'scheduled', description: ' ' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const { errors } = r as Extract<ValidationResult, { ok: false }>;
    expect(Object.keys(errors).sort()).toEqual(['aircraft_id', 'description', 'maintenance_type']);
  });
  it('rejects negative or non-numeric hours', () => {
    const r = buildMaintenancePayload(form({ flight_hours_at_service: '-1', next_due_flight_hours: 'ten' }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const { errors } = r as Extract<ValidationResult, { ok: false }>;
    expect(errors.flight_hours_at_service).toBeTruthy();
    expect(errors.next_due_flight_hours).toBeTruthy();
  });
  it('keeps entered values, trimmed, and a real 0 hours', () => {
    const r = buildMaintenancePayload(form({
      maintenance_type: 'battery_replacement',
      component_id: ' BAT-TEST-1 ',
      flight_hours_at_service: '0',
      performed_by_name: ' TEST shop ',
      evidence_url: 'https://example.test/receipt',
      open_issues: 'TEST: gimbal noise',
      next_due_date: '2027-02-01',
      next_due_flight_hours: '25.555',
      is_test: true,
    }));
    if (!r.ok) throw new Error('expected ok');
    expect(r.payload).toMatchObject({
      maintenance_type: 'battery_replacement',
      component_id: 'BAT-TEST-1',
      flight_hours_at_service: 0,
      performed_by_name: 'TEST shop',
      evidence_url: 'https://example.test/receipt',
      open_issues: 'TEST: gimbal noise',
      next_due_date: '2027-02-01',
      next_due_flight_hours: 25.56,
      is_test: true,
      performed_at: '2026-11-24T12:00:00Z',
    });
  });
});
