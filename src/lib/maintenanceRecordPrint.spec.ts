import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MaintenanceLogEntry } from '@/types/fleet';
import {
  buildMaintenanceRecordHtml,
  EMPTY_HISTORY,
  entriesInPeriod,
  NOT_A_CERTIFICATION,
  NO_NEXT_DUE,
  RECORD_TITLE,
  type MaintenanceRecordInput,
} from './maintenanceRecordPrint';

// TEST data only: no real serial numbers or registrations.
const AIRCRAFT: MaintenanceRecordInput['aircraft'] = {
  id: '00000000-0000-4000-8000-000000000001',
  model: 'TEST AIRCRAFT (sample)',
  serial_number: 'TEST-SN-0000',
  nickname: null,
  faa_registration: 'TEST-REG-0000',
  firmware_version: null,
  status: 'active',
};

const TYPES = ['inspection', 'service', 'repair', 'part_replacement', 'battery_replacement'] as const;

function entry(i: number, overrides: Partial<MaintenanceLogEntry> = {}): MaintenanceLogEntry {
  const d = new Date(Date.UTC(2026, 0, 5 + i * 4));
  return {
    id: `test-${i}`,
    equipment_id: AIRCRAFT.id,
    equipment_type: 'aircraft',
    maintenance_type: TYPES[i % TYPES.length] as MaintenanceLogEntry['maintenance_type'],
    description: `TEST entry ${i + 1}: pre-flight visual inspection of airframe, props and gimbal; arms and motors checked by hand.`,
    performed_at: d.toISOString(),
    performed_by: null,
    cost_cents: null,
    parts_used: null,
    next_due_date: i % 3 === 0 ? new Date(Date.UTC(2026, 6, 1 + i)).toISOString().slice(0, 10) : null,
    notes: null,
    created_at: d.toISOString(),
    aircraft_id: AIRCRAFT.id,
    component_id: i % 2 ? `TEST-BATT-${i}` : null,
    flight_hours_at_service: i % 4 === 0 ? null : 10 + i * 0.7,
    results: i % 2 ? 'TEST result: no defects found' : null,
    performed_by_name: i % 5 === 0 ? null : 'TEST Technician',
    evidence_url: i % 3 === 1 ? `TEST-evidence-${i}.jpg` : null,
    open_issues: i % 7 === 0 ? 'TEST open issue: prop nick to re-check' : null,
    next_due_flight_hours: i % 4 === 1 ? 50 + i : null,
    is_test: true,
    ...overrides,
  };
}

const PERIOD = { from: '2026-01-01', to: '2026-12-31' };
const BANNER = 'TEST DATA - sample record, not a real aircraft';

function input(entries: MaintenanceLogEntry[], testBanner: string | undefined = BANNER): MaintenanceRecordInput {
  return { aircraft: AIRCRAFT, entries, period: PERIOD, generatedOn: '2026-11-24', crestSrc: 'sai-crest.png', testBanner };
}

const textOf = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ');

describe('buildMaintenanceRecordHtml', () => {
  it('empty history: says so, still has letterhead, next due and the signature line', () => {
    const html = buildMaintenanceRecordHtml(input([]));
    expect(html).toContain(EMPTY_HISTORY);
    expect(html).toContain(NO_NEXT_DUE);
    expect(html).toContain('Sentinel Aerial Inspections');
    expect(html).toContain('Reviewed by (name)');
    expect(html).toContain('Signature');
    expect(html).toContain(RECORD_TITLE);
  });

  it('never claims certification, airworthiness or compliance outside the disclaimer', () => {
    const html = buildMaintenanceRecordHtml(input(Array.from({ length: 6 }, (_, i) => entry(i))));
    const rest = textOf(html).replace(NOT_A_CERTIFICATION, '').replace('Maintenance record, not a certification', '');
    expect(rest).not.toMatch(/certif|airworth|complian|part 107/i);
    expect(html).toContain(NOT_A_CERTIFICATION);
  });

  it('shows unknown values as "unknown", never a made-up number', () => {
    const html = buildMaintenanceRecordHtml(input([entry(0)]));
    expect(textOf(html)).toMatch(/unknown/);
  });

  it('live records leave out TEST rows and rows outside the period', () => {
    const live = [entry(1, { is_test: false }), entry(2, { is_test: true }), entry(3, { is_test: false, performed_at: '2025-06-01T00:00:00Z' })];
    expect(entriesInPeriod(input(live, '')).map((e) => e.id)).toEqual(['test-1']);
  });

  it('escapes HTML from record fields', () => {
    const html = buildMaintenanceRecordHtml(input([entry(1, { description: '<script>x</script>' })]));
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&lt;script&gt;');
  });

  it('lists history oldest first with dates', () => {
    const html = buildMaintenanceRecordHtml(input([entry(2), entry(0)]));
    expect(html.indexOf('2026-01-05')).toBeLessThan(html.indexOf('2026-01-13'));
  });
});

// Writes the three sample HTML files only when asked:
//   MAINT_SAMPLES_OUT=<dir> MAINT_CREST=<file url> npx vitest run src/lib/maintenanceRecordPrint.spec.ts
const out = process.env.MAINT_SAMPLES_OUT;
describe.skipIf(!out)('sample output (TEST data)', () => {
  it('writes empty, single-page and multi-page samples', () => {
    mkdirSync(out as string, { recursive: true });
    const crest = process.env.MAINT_CREST ?? 'sai-crest.png';
    const cases: [string, MaintenanceLogEntry[]][] = [
      ['empty-history', []],
      ['single-page', Array.from({ length: 2 }, (_, i) => entry(i, { description: `TEST entry ${i + 1}: visual inspection.`, results: null, evidence_url: null }))],
      ['multi-page', Array.from({ length: 45 }, (_, i) => entry(i))],
    ];
    for (const [name, entries] of cases) {
      writeFileSync(join(out as string, `${name}.html`), buildMaintenanceRecordHtml({ ...input(entries), crestSrc: crest }));
    }
  });
});
