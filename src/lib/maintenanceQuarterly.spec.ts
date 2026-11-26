import { describe, it, expect } from 'vitest';
import {
  HOURS_UNKNOWN_DUE,
  NO_MAINTENANCE,
  FLIGHT_HOURS_UNKNOWN,
  buildFlightHoursPayload,
  parseFlightLogExport,
  quarterOf,
  summarizeAircraft,
  type FlightHoursReading,
} from './maintenanceQuarterly';
import type { MaintenanceLogEntry } from '@/types/fleet';

const A = { id: 'a1', model: 'TEST model', serial_number: 'SN-1', nickname: null };
const TODAY = new Date(2026, 10, 24); // 2026-11-24

function entry(p: Partial<MaintenanceLogEntry>): MaintenanceLogEntry {
  return {
    id: 'e1',
    equipment_id: 'a1',
    equipment_type: 'aircraft',
    maintenance_type: 'inspection',
    description: 'TEST inspection',
    performed_at: '2026-10-01T12:00:00Z',
    performed_by: null,
    cost_cents: null,
    parts_used: null,
    next_due_date: null,
    notes: null,
    created_at: '2026-10-01T12:00:00Z',
    aircraft_id: 'a1',
    is_test: false,
    ...p,
  } as MaintenanceLogEntry;
}

const reading = (p: Partial<FlightHoursReading>): FlightHoursReading => ({
  id: 'r1',
  aircraft_id: 'a1',
  total_flight_hours: 10,
  as_of_date: '2026-11-01',
  source: 'manual',
  source_detail: null,
  entered_by: null,
  entered_by_name: 'TEST person',
  entered_at: '2026-11-01T10:00:00.000Z',
  ...p,
});

describe('quarterOf', () => {
  it('gives the calendar quarter', () => {
    expect(quarterOf(TODAY)).toEqual({ label: 'Q4 2026', start: '2026-10-01', end: '2026-12-31' });
    expect(quarterOf(new Date(2026, 1, 3)).end).toBe('2026-03-31');
  });
});

describe('summarizeAircraft', () => {
  it('no history: says no maintenance recorded, not blank or guessed', () => {
    const s = summarizeAircraft(A, [], [], TODAY);
    expect(s.hasHistory).toBe(false);
    expect(s.lastService).toBe(NO_MAINTENANCE);
    expect(s.upcomingText).toBe(NO_MAINTENANCE);
    expect(s.openIssues).toEqual([]);
    expect(s.flightActivity).toBe(FLIGHT_HOURS_UNKNOWN);
  });

  it('ignores TEST rows and other aircraft', () => {
    const s = summarizeAircraft(A, [entry({ is_test: true }), entry({ aircraft_id: 'b2', equipment_id: 'b2' })], [], TODAY);
    expect(s.lastService).toBe(NO_MAINTENANCE);
  });

  it('flags an overdue date and a due-this-quarter date', () => {
    const s = summarizeAircraft(
      A,
      [
        entry({ id: 'x', maintenance_type: 'inspection', next_due_date: '2026-11-01' }),
        entry({ id: 'y', maintenance_type: 'service', performed_at: '2026-09-01T00:00:00Z', next_due_date: '2026-12-15' }),
      ],
      [],
      TODAY
    );
    expect(s.upcoming.find((u) => u.due === '2026-11-01')?.status).toBe('overdue');
    expect(s.upcoming.find((u) => u.due === '2026-12-15')?.status).toBe('due this quarter');
    expect(s.lastService).toMatch(/^2026-10-01: /);
  });

  it('a newer entry of the same kind supersedes the older next due', () => {
    const s = summarizeAircraft(
      A,
      [
        entry({ id: 'old', performed_at: '2026-06-01T00:00:00Z', next_due_date: '2026-07-01' }),
        entry({ id: 'new', performed_at: '2026-10-01T00:00:00Z', next_due_date: '2027-04-01' }),
      ],
      [],
      TODAY
    );
    expect(s.upcoming).toHaveLength(1);
    expect(s.upcoming[0].status).toBe('upcoming');
  });

  it('flight-hour threshold with unknown current hours cannot be computed', () => {
    const s = summarizeAircraft(A, [entry({ next_due_flight_hours: 50 })], [], TODAY);
    expect(s.upcoming[0].basis).toBe('flight hours');
    expect(s.upcoming[0].status).toBe(HOURS_UNKNOWN_DUE);
    expect(s.upcomingText).toContain('cannot be computed, hours unknown');
  });

  it('flight-hour threshold is computed from the latest reading, never from maintenance rows', () => {
    const readings = [
      reading({ id: 'r-old', total_flight_hours: 60, as_of_date: '2026-09-01' }),
      reading({ id: 'r-new', total_flight_hours: 40, as_of_date: '2026-11-20' }),
    ];
    // flight_hours_at_service on the maintenance row must not stand in for current hours
    const s = summarizeAircraft(A, [entry({ next_due_flight_hours: 50, flight_hours_at_service: 55 })], readings, TODAY);
    expect(s.upcoming[0].status).toBe('upcoming');
    const over = summarizeAircraft(A, [entry({ next_due_flight_hours: 30 })], readings, TODAY);
    expect(over.upcoming[0].status).toBe('overdue');
    expect(s.flightActivity).toContain('as of 2026-11-20');
    expect(s.flightActivity).toContain('source: manual entry');
    expect(s.flightActivity).toContain('entered by TEST person');
  });

  it('flight hours alone are not maintenance', () => {
    const s = summarizeAircraft(A, [], [reading({})], TODAY);
    expect(s.lastService).toBe(NO_MAINTENANCE);
    expect(s.hasHistory).toBe(false);
  });

  it('lists open issues with their dates', () => {
    const s = summarizeAircraft(A, [entry({ open_issues: 'TEST prop chip' })], [], TODAY);
    expect(s.openIssues).toEqual([{ date: '2026-10-01', text: 'TEST prop chip' }]);
  });

  it('a later entry for the same component closes an earlier open issue', () => {
    const issue = entry({ id: 'e1', open_issues: 'TEST prop chip', performed_at: '2026-10-01T12:00:00Z' });
    const repair = entry({ id: 'e2', maintenance_type: 'repair', open_issues: null, performed_at: '2026-11-01T12:00:00Z' });
    expect(summarizeAircraft(A, [issue, repair], [], TODAY).openIssues).toEqual([]);
  });

  it('a later entry restating the issue keeps it open with its newest date', () => {
    const issue = entry({ id: 'e1', open_issues: 'TEST prop chip', performed_at: '2026-10-01T12:00:00Z' });
    const recheck = entry({ id: 'e2', open_issues: 'TEST prop chip, re-check', performed_at: '2026-11-01T12:00:00Z' });
    expect(summarizeAircraft(A, [issue, recheck], [], TODAY).openIssues).toEqual([
      { date: '2026-11-01', text: 'TEST prop chip, re-check' },
    ]);
  });

  it('an entry on another component does not close the issue', () => {
    const issue = entry({ id: 'e1', component_id: 'TEST-PROP-1', open_issues: 'TEST prop chip', performed_at: '2026-10-01T12:00:00Z' });
    const other = entry({ id: 'e2', component_id: 'TEST-BATT-1', maintenance_type: 'battery_replacement', performed_at: '2026-11-01T12:00:00Z' });
    expect(summarizeAircraft(A, [issue, other], [], TODAY).openIssues).toEqual([
      { date: '2026-10-01', text: 'TEST prop chip' },
    ]);
  });

  it('an older-dialog entry logged after an issue leaves the issue open', () => {
    // MaintenanceLogDialog rows carry equipment_type/equipment_id only: no aircraft_id, no open_issues field.
    const issue = entry({ id: 'e1', open_issues: 'TEST cracked arm', performed_at: '2026-10-01T12:00:00Z' });
    const firmware = entry({
      id: 'e2',
      maintenance_type: 'firmware_update' as MaintenanceLogEntry['maintenance_type'],
      aircraft_id: undefined,
      open_issues: undefined,
      performed_at: '2026-11-01T15:30:00.000Z',
      created_at: '2026-11-01T15:30:00.000Z',
    });
    for (const logs of [[issue, firmware], [firmware, issue]]) {
      expect(summarizeAircraft(A, logs, [], TODAY).openIssues).toEqual([{ date: '2026-10-01', text: 'TEST cracked arm' }]);
    }
  });

  it('an issue found and repaired the same day: the later save wins in either input order', () => {
    const found = entry({ id: 'e1', open_issues: 'TEST chipped prop', performed_at: '2026-11-20T12:00:00Z', created_at: '2026-11-20T14:00:00Z' });
    const swapped = entry({ id: 'e2', maintenance_type: 'repair', open_issues: null, performed_at: '2026-11-20T12:00:00Z', created_at: '2026-11-20T14:05:00Z' });
    expect(summarizeAircraft(A, [found, swapped], [], TODAY).openIssues).toEqual([]);
    expect(summarizeAircraft(A, [swapped, found], [], TODAY).openIssues).toEqual([]);
    // And the reverse save order keeps the issue open in either input order.
    const foundLater = { ...found, created_at: '2026-11-20T14:10:00Z' };
    const want = [{ date: '2026-11-20', text: 'TEST chipped prop' }];
    expect(summarizeAircraft(A, [foundLater, swapped], [], TODAY).openIssues).toEqual(want);
    expect(summarizeAircraft(A, [swapped, foundLater], [], TODAY).openIssues).toEqual(want);
  });

  it('same-day entries give the same next-due date in either input order', () => {
    const first = entry({ id: 'e1', performed_at: '2026-11-20T12:00:00Z', created_at: '2026-11-20T09:00:00Z', next_due_date: '2026-12-01' });
    const second = entry({ id: 'e2', performed_at: '2026-11-20T12:00:00Z', created_at: '2026-11-20T10:00:00Z', next_due_date: '2027-02-20' });
    const a = summarizeAircraft(A, [first, second], [], TODAY);
    const b = summarizeAircraft(A, [second, first], [], TODAY);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toContain('2027-02-20');
    expect(JSON.stringify(a)).not.toContain('2026-12-01');
  });
});

describe('buildFlightHoursPayload', () => {
  const now = new Date('2026-11-24T15:00:00Z');
  const base = { aircraftId: 'a1', totalHours: '27.1', asOfDate: '2026-09-06', source: 'manual' as const, sourceDetail: '', enteredByName: 'TEST person' };

  it('stamps who entered it and when', () => {
    const r = buildFlightHoursPayload(base, 'user-1', now);
    expect(r.ok).toBe(true);
    const p = (r as Extract<typeof r, { ok: true }>).payload;
    expect(p.entered_by).toBe('user-1');
    expect(p.entered_by_name).toBe('TEST person');
    expect(p.entered_at).toBe('2026-11-24T15:00:00.000Z');
    expect(p.total_flight_hours).toBe(27.1);
    expect(p.source_detail).toBeNull();
  });

  it('refuses blank hours, a missing name and a future date', () => {
    const r = buildFlightHoursPayload({ ...base, totalHours: '', enteredByName: ' ', asOfDate: '2027-01-01' }, null, now);
    expect(r.ok).toBe(false);
    expect((r as Extract<typeof r, { ok: false }>).errors).toHaveLength(3);
  });
});

describe('parseFlightLogExport', () => {
  it('sums a seconds column and reads the date range', () => {
    const csv = 'Date,Air Seconds\n2026-01-02,3600\n"2026-03-04",1800\n';
    expect(parseFlightLogExport(csv)).toEqual({
      ok: true, totalHours: 1.5, flights: 2, column: 'air seconds', firstDate: '2026-01-02', lastDate: '2026-03-04',
    });
  });

  it('reads h:mm:ss durations', () => {
    const r = parseFlightLogExport('Start,Flight Time\n2026-05-01 10:00,0:30:00\n2026-05-02 10:00,1:00:00\n');
    expect(r.ok && r.totalHours).toBe(1.5);
  });

  it('refuses a bare number in an unnamed unit instead of guessing', () => {
    const r = parseFlightLogExport('Date,Duration\n2026-01-02,25\n');
    expect(r.ok).toBe(false);
    expect((r as Extract<typeof r, { ok: false }>).error).toMatch(/not guessed/);
  });

  it('refuses a file with a blank duration cell instead of an understated total', () => {
    const r = parseFlightLogExport('Date,Flight Time\n2026-05-01,0:30:00\n2026-05-02,\n2026-05-03,1:00:00\n');
    expect(r.ok).toBe(false);
    expect((r as Extract<typeof r, { ok: false }>).error).toMatch(/row 3/);
    expect((r as Extract<typeof r, { ok: false }>).error).toMatch(/understated/);
  });

  it('refuses a file without a duration column', () => {
    expect(parseFlightLogExport('Date,Location\n2026-01-02,Field\n').ok).toBe(false);
  });
});
