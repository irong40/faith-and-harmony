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

  it('refuses a file without a duration column', () => {
    expect(parseFlightLogExport('Date,Location\n2026-01-02,Field\n').ok).toBe(false);
  });
});
