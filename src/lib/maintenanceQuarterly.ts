// Quarterly maintenance view and flight-hours fallback (Adam decision
// 2026-11-22 #0, build part 2). Pure functions so the rules are tested.
//
// Two kinds of record are kept apart on purpose:
//  - maintenance_log rows: evidence that maintenance was done.
//  - aircraft_flight_hours rows: flight activity (a dated hours total with its
//    source). They never count as maintenance.
// Unknown stays unknown: no guessed hours, no default dates.
import type { Aircraft, MaintenanceLogEntry } from '@/types/fleet';
import { eventTypeLabel, formatFlightHours } from './maintenanceRecord';

export const NO_MAINTENANCE = 'no maintenance recorded';
export const HOURS_UNKNOWN_DUE = 'cannot be computed, hours unknown';
export const FLIGHT_HOURS_UNKNOWN = 'flight hours unknown (no reading entered)';

export type FlightHoursSource = 'manual' | 'export_import' | 'airdata_verified';

export const FLIGHT_HOURS_SOURCE_LABEL: Record<FlightHoursSource, string> = {
  manual: 'manual entry',
  export_import: 'imported export file',
  airdata_verified: 'AirData (existing access)',
};

export interface FlightHoursReading {
  id: string;
  aircraft_id: string;
  total_flight_hours: number | string;
  as_of_date: string;
  source: FlightHoursSource;
  source_detail: string | null;
  entered_by: string | null;
  entered_by_name: string;
  entered_at: string;
  is_test?: boolean;
}

export interface Quarter {
  label: string;
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function quarterOf(today: Date): Quarter {
  const q = Math.floor(today.getMonth() / 3);
  const y = today.getFullYear();
  const start = new Date(y, q * 3, 1);
  const end = new Date(y, q * 3 + 3, 0);
  return { label: `Q${q + 1} ${y}`, start: ymd(start), end: ymd(end) };
}

/** Newest reading by as_of_date, then entered_at. TEST rows are ignored. */
export function latestReading(readings: FlightHoursReading[]): FlightHoursReading | null {
  const live = readings.filter((r) => !r.is_test);
  if (live.length === 0) return null;
  return [...live].sort((a, b) =>
    a.as_of_date === b.as_of_date
      ? b.entered_at.localeCompare(a.entered_at)
      : b.as_of_date.localeCompare(a.as_of_date)
  )[0];
}

export function describeReading(r: FlightHoursReading | null): string {
  if (!r) return FLIGHT_HOURS_UNKNOWN;
  const detail = r.source_detail ? `, ${r.source_detail}` : '';
  return `${formatFlightHours(r.total_flight_hours)} as of ${r.as_of_date} (source: ${
    FLIGHT_HOURS_SOURCE_LABEL[r.source] ?? r.source
  }${detail}; entered by ${r.entered_by_name} at ${r.entered_at})`;
}

export type DueStatus = 'overdue' | 'due this quarter' | 'upcoming' | typeof HOURS_UNKNOWN_DUE;

export interface UpcomingItem {
  kind: string;
  component: string | null;
  basis: 'date' | 'flight hours';
  due: string;
  status: DueStatus;
  fromEntryDate: string;
}

export interface AircraftQuarterSummary {
  aircraft: Pick<Aircraft, 'id' | 'model' | 'serial_number' | 'nickname'>;
  hasHistory: boolean;
  lastService: string;
  openIssues: { date: string; text: string }[];
  upcoming: UpcomingItem[];
  upcomingText: string;
  flightActivity: string;
}

const num = (v: number | string | null | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const dateOnly = (iso: string) => iso.slice(0, 10);

function entriesFor(aircraftId: string, logs: MaintenanceLogEntry[]) {
  return logs
    .filter(
      (e) =>
        !e.is_test &&
        (e.aircraft_id === aircraftId ||
          (e.equipment_type === 'aircraft' && e.equipment_id === aircraftId))
    )
    .sort(compareNewestFirst);
}

type Ordered = Pick<MaintenanceLogEntry, 'performed_at'> & { created_at?: string | null };

/**
 * Newest first: performed_at, then created_at. The form stamps every chosen
 * date at 12:00Z, so same-day entries tie on performed_at; the row saved later
 * counts as newer, whatever order the rows arrive in.
 */
export function compareNewestFirst(a: Ordered, b: Ordered): number {
  return b.performed_at.localeCompare(a.performed_at) || (b.created_at ?? '').localeCompare(a.created_at ?? '');
}

/** Oldest first: the reverse of compareNewestFirst. */
export function compareOldestFirst(a: Ordered, b: Ordered): number {
  return compareNewestFirst(b, a);
}

/**
 * The newest entry per event type + component, from a history sorted newest
 * first. An older entry of the same kind is superseded by the newer one, so its
 * next-due values no longer apply. Used by the quarterly view and the print.
 */
export function newestPerTypeAndComponent<T extends Pick<MaintenanceLogEntry, 'maintenance_type' | 'component_id'>>(
  historyNewestFirst: T[]
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const e of historyNewestFirst) {
    const key = `${e.maintenance_type}|${e.component_id ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/** True for rows written by the aircraft maintenance form, which has the open-issues field. */
export function canRecordOpenIssues(e: Pick<MaintenanceLogEntry, 'aircraft_id'>): boolean {
  return Boolean(e.aircraft_id);
}

/**
 * Open issues: each entry's open-issues field lists what is still open on its
 * component (or the airframe when no component is named). The newest entry for
 * that component replaces the list, so a later entry with the field left blank
 * closes the earlier issue.
 *
 * Only entries that can record open issues count. Rows from the older Fleet
 * "Log maintenance" dialog have no open-issues field and no aircraft_id (they
 * carry only equipment_type/equipment_id), so they are skipped here: a
 * firmware update logged there must not close an issue nobody fixed.
 */
export function openIssuesFrom(historyNewestFirst: MaintenanceLogEntry[]): { date: string; text: string }[] {
  const seen = new Set<string>();
  const out: { date: string; text: string }[] = [];
  for (const e of historyNewestFirst) {
    if (!canRecordOpenIssues(e)) continue;
    const key = e.component_id ?? '';
    if (seen.has(key)) continue;
    seen.add(key);
    const text = (e.open_issues ?? '').trim();
    if (text) out.push({ date: dateOnly(e.performed_at), text });
  }
  return out;
}

export function summarizeAircraft(
  aircraft: AircraftQuarterSummary['aircraft'],
  logs: MaintenanceLogEntry[],
  readings: FlightHoursReading[],
  today: Date
): AircraftQuarterSummary {
  const history = entriesFor(aircraft.id, logs);
  const reading = latestReading(readings.filter((r) => r.aircraft_id === aircraft.id));
  const currentHours = reading ? num(reading.total_flight_hours) : null;
  const q = quarterOf(today);
  const todayStr = ymd(today);

  const last = history[0];
  const lastService = last
    ? `${dateOnly(last.performed_at)}: ${eventTypeLabel(last.maintenance_type)}${
        last.description ? ` (${last.description})` : ''
      }`
    : NO_MAINTENANCE;

  const openIssues = openIssuesFrom(history);

  // The newest entry per event type + component sets the next due.
  const upcoming: UpcomingItem[] = [];
  for (const e of newestPerTypeAndComponent(history)) {
    const base = {
      kind: eventTypeLabel(e.maintenance_type),
      component: e.component_id ?? null,
      fromEntryDate: dateOnly(e.performed_at),
    };
    if (e.next_due_date) {
      const d = e.next_due_date.slice(0, 10);
      const status: DueStatus = d < todayStr ? 'overdue' : d <= q.end ? 'due this quarter' : 'upcoming';
      upcoming.push({ ...base, basis: 'date', due: d, status });
    }
    const threshold = num(e.next_due_flight_hours);
    if (threshold !== null) {
      const status: DueStatus =
        currentHours === null
          ? HOURS_UNKNOWN_DUE
          : currentHours >= threshold
            ? 'overdue'
            : 'upcoming';
      upcoming.push({ ...base, basis: 'flight hours', due: formatFlightHours(threshold), status });
    }
  }

  return {
    aircraft,
    hasHistory: history.length > 0,
    lastService,
    openIssues,
    upcoming,
    upcomingText: !history.length
      ? NO_MAINTENANCE
      : upcoming.length
        ? upcoming.map((u) => `${u.kind} by ${u.due}: ${u.status}`).join('; ')
        : 'no next due set',
    flightActivity: describeReading(reading),
  };
}

// ---------------------------------------------------------------- fallback

export interface FlightHoursFormValues {
  aircraftId: string;
  totalHours: string;
  asOfDate: string;
  source: FlightHoursSource;
  sourceDetail: string;
  enteredByName: string;
}

export interface FlightHoursInsertPayload {
  aircraft_id: string;
  total_flight_hours: number;
  as_of_date: string;
  source: FlightHoursSource;
  source_detail: string | null;
  entered_by: string | null;
  entered_by_name: string;
  entered_at: string;
}

export type FlightHoursResult =
  | { ok: true; payload: FlightHoursInsertPayload }
  | { ok: false; errors: string[] };

/** Validate a flight-hours reading and stamp who entered it and when. */
export function buildFlightHoursPayload(
  v: FlightHoursFormValues,
  enteredById: string | null,
  now: Date
): FlightHoursResult {
  const errors: string[] = [];
  const hours = v.totalHours.trim() === '' ? NaN : Number(v.totalHours);
  if (!v.aircraftId) errors.push('Choose the aircraft.');
  if (!Number.isFinite(hours) || hours < 0) errors.push('Enter total flight hours as a number of 0 or more.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.asOfDate)) errors.push('Enter the date the total is as of.');
  else if (v.asOfDate > ymd(now)) errors.push('The as-of date cannot be in the future.');
  if (!v.enteredByName.trim()) errors.push('Enter who is entering this reading.');
  if (!(v.source in FLIGHT_HOURS_SOURCE_LABEL)) errors.push('Choose the source.');
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    payload: {
      aircraft_id: v.aircraftId,
      total_flight_hours: Math.round(hours * 100) / 100,
      as_of_date: v.asOfDate,
      source: v.source,
      source_detail: v.sourceDetail.trim() || null,
      entered_by: enteredById,
      entered_by_name: v.enteredByName.trim(),
      entered_at: now.toISOString(),
    },
  };
}

/** Split CSV text into rows, honouring double-quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

export type ExportParse =
  | { ok: true; totalHours: number; flights: number; column: string; firstDate: string | null; lastDate: string | null }
  | { ok: false; error: string };

const HMS = /^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/;

/**
 * Sum flight durations from an exported flight-log CSV. The duration column
 * must name its unit (seconds, minutes or hours) or hold h:mm:ss values, so a
 * bare number is never read in a guessed unit. The column layout of a real
 * AirData export was not verified (no export on file); this reads any CSV that
 * meets the rule and refuses the rest with a reason.
 */
export function parseFlightLogExport(text: string): ExportParse {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: 'The file has no flight rows.' };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = header.findIndex((h) => /(air ?(time|seconds)|flight ?(time|duration)|duration)/.test(h));
  if (idx < 0) return { ok: false, error: 'No flight-duration column found (looked for air time, flight time, duration).' };
  const name = header[idx];
  const unit = /sec/.test(name) ? 1 / 3600 : /min/.test(name) ? 1 / 60 : /hour|\(h\)|hrs?\b/.test(name) ? 1 : null;
  const dateIdx = header.findIndex((h, i) => i !== idx && /date|start/.test(h));
  let total = 0;
  let flights = 0;
  const dates: string[] = [];
  const blankRows: number[] = [];
  rows.slice(1).forEach((r, i) => {
    if (!(r[idx] ?? '').trim()) blankRows.push(i + 2);
  });
  if (blankRows.length) {
    // A skipped flight would understate the total; refuse rather than guess.
    return {
      ok: false,
      error: `${blankRows.length} row(s) have no flight duration (row ${blankRows.join(', ')}); the total would be understated, so the file was not read. Fix or remove those rows.`,
    };
  }
  for (const r of rows.slice(1)) {
    const raw = (r[idx] ?? '').trim();
    let hours: number;
    const m = raw.match(HMS);
    if (m) {
      // h:mm:ss, or h:mm when only two parts.
      hours = Number(m[1]) + Number(m[2]) / 60 + (m[3] ? Number(m[3]) / 3600 : 0);
    } else if (unit !== null && Number.isFinite(Number(raw))) {
      hours = Number(raw) * unit;
    } else {
      return {
        ok: false,
        error: unit === null
          ? `Column "${name}" does not name its unit and "${raw}" is not h:mm:ss; hours were not guessed.`
          : `Row ${flights + 2}: "${raw}" is not a duration.`,
      };
    }
    if (hours < 0) return { ok: false, error: `Row ${flights + 2}: negative duration.` };
    total += hours;
    flights++;
    if (dateIdx >= 0) {
      const d = (r[dateIdx] ?? '').trim().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) dates.push(d);
    }
  }
  if (!flights) return { ok: false, error: 'The file has no flight durations.' };
  dates.sort();
  return {
    ok: true,
    totalHours: Math.round(total * 100) / 100,
    flights,
    column: name,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
  };
}
