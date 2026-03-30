// Enqueue Drip Edge Function Tests
// Tests for pure logic: validation, schedule building, and constants.
// No database dependency — tests extracted functions only.

import { assertEquals, assert, assertNotEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import {
  SEQUENCE_SCHEDULES,
  validateEnqueueRequest,
  buildScheduleRows,
} from './index.ts';
import type { SequenceType } from './index.ts';

// ---- SEQUENCE_SCHEDULES ----

Deno.test('SEQUENCE_SCHEDULES has exactly 3 sequence types', () => {
  const keys = Object.keys(SEQUENCE_SCHEDULES);
  assertEquals(keys.length, 3);
  assert(keys.includes('outreach_drip'));
  assert(keys.includes('post_delivery'));
  assert(keys.includes('vapi_followup'));
});

Deno.test('outreach_drip has 3 steps at correct day offsets', () => {
  assertEquals(SEQUENCE_SCHEDULES.outreach_drip, [0, 3, 9]);
});

Deno.test('post_delivery has 4 steps at correct day offsets', () => {
  assertEquals(SEQUENCE_SCHEDULES.post_delivery, [0, 6, 13, 29]);
});

Deno.test('vapi_followup has 1 step at offset 0 (immediate)', () => {
  assertEquals(SEQUENCE_SCHEDULES.vapi_followup, [0]);
});

// ---- validateEnqueueRequest ----

Deno.test('validateEnqueueRequest returns error when lead_id is missing', () => {
  const result = validateEnqueueRequest({ sequence_type: 'outreach_drip' } as any);
  assertNotEquals(result, null);
  assert(result!.includes('lead_id'));
});

Deno.test('validateEnqueueRequest returns error when sequence_type is missing', () => {
  const result = validateEnqueueRequest({ lead_id: 'abc-123' } as any);
  assertNotEquals(result, null);
  assert(result!.includes('sequence_type'));
});

Deno.test('validateEnqueueRequest returns error when both fields are missing', () => {
  const result = validateEnqueueRequest({});
  assertNotEquals(result, null);
});

Deno.test('validateEnqueueRequest returns error for invalid sequence_type', () => {
  const result = validateEnqueueRequest({
    lead_id: 'abc-123',
    sequence_type: 'invalid_type' as SequenceType,
  });
  assertNotEquals(result, null);
  assert(result!.includes('Invalid sequence_type'));
});

Deno.test('validateEnqueueRequest returns null for valid outreach_drip request', () => {
  const result = validateEnqueueRequest({
    lead_id: 'abc-123',
    sequence_type: 'outreach_drip',
  });
  assertEquals(result, null);
});

Deno.test('validateEnqueueRequest returns null for valid post_delivery request', () => {
  const result = validateEnqueueRequest({
    lead_id: 'abc-123',
    sequence_type: 'post_delivery',
  });
  assertEquals(result, null);
});

Deno.test('validateEnqueueRequest returns null for valid vapi_followup request', () => {
  const result = validateEnqueueRequest({
    lead_id: 'abc-123',
    sequence_type: 'vapi_followup',
  });
  assertEquals(result, null);
});

Deno.test('validateEnqueueRequest accepts optional context field', () => {
  const result = validateEnqueueRequest({
    lead_id: 'abc-123',
    sequence_type: 'outreach_drip',
    context: { service_focus: 'roof inspections' },
  });
  assertEquals(result, null);
});

// ---- buildScheduleRows ----

Deno.test('buildScheduleRows creates correct number of rows for outreach_drip', () => {
  const rows = buildScheduleRows(
    { email: 'test@example.com', company_name: 'Acme Roofing' },
    'lead-1',
    'outreach_drip',
    {},
    new Date('2026-03-10T10:00:00Z'),
  );
  assertEquals(rows.length, 3);
});

Deno.test('buildScheduleRows creates correct number of rows for post_delivery', () => {
  const rows = buildScheduleRows(
    { email: 'test@example.com', company_name: 'Acme Roofing' },
    'lead-1',
    'post_delivery',
    {},
    new Date('2026-03-10T10:00:00Z'),
  );
  assertEquals(rows.length, 4);
});

Deno.test('buildScheduleRows creates 1 row for vapi_followup', () => {
  const rows = buildScheduleRows(
    { email: 'test@example.com', company_name: 'Acme Roofing' },
    'lead-1',
    'vapi_followup',
    {},
    new Date('2026-03-10T10:00:00Z'),
  );
  assertEquals(rows.length, 1);
});

Deno.test('buildScheduleRows sets sequence_step starting at 1', () => {
  const rows = buildScheduleRows(
    { email: 'test@example.com', company_name: 'Acme' },
    'lead-1',
    'outreach_drip',
    {},
    new Date('2026-03-10T10:00:00Z'),
  );
  assertEquals(rows[0].sequence_step, 1);
  assertEquals(rows[1].sequence_step, 2);
  assertEquals(rows[2].sequence_step, 3);
});

Deno.test('buildScheduleRows schedules all emails at 13:00 UTC (9 AM ET)', () => {
  const rows = buildScheduleRows(
    { email: 'test@example.com', company_name: 'Acme' },
    'lead-1',
    'outreach_drip',
    {},
    new Date('2026-03-10T10:00:00Z'),
  );
  for (const row of rows) {
    const d = new Date(row.scheduled_for);
    assertEquals(d.getUTCHours(), 13);
    assertEquals(d.getUTCMinutes(), 0);
    assertEquals(d.getUTCSeconds(), 0);
  }
});

Deno.test('buildScheduleRows applies correct day offsets for outreach_drip', () => {
  const now = new Date('2026-03-10T10:00:00Z');
  const rows = buildScheduleRows(
    { email: 'test@example.com', company_name: 'Acme' },
    'lead-1',
    'outreach_drip',
    {},
    now,
  );
  // Day 0 = March 10, Day 3 = March 13, Day 9 = March 19
  assertEquals(new Date(rows[0].scheduled_for).getUTCDate(), 10);
  assertEquals(new Date(rows[1].scheduled_for).getUTCDate(), 13);
  assertEquals(new Date(rows[2].scheduled_for).getUTCDate(), 19);
});

Deno.test('buildScheduleRows populates lead info correctly', () => {
  const rows = buildScheduleRows(
    { email: 'boss@acme.com', company_name: 'Acme Roofing' },
    'lead-xyz',
    'outreach_drip',
    { service_focus: 'roof inspections' },
    new Date('2026-03-10T10:00:00Z'),
  );
  for (const row of rows) {
    assertEquals(row.lead_id, 'lead-xyz');
    assertEquals(row.recipient_email, 'boss@acme.com');
    assertEquals(row.recipient_name, 'Acme Roofing');
    assertEquals(row.sequence_type, 'outreach_drip');
    assertEquals(row.status, 'pending');
    assertEquals(row.context.service_focus, 'roof inspections');
  }
});

Deno.test('buildScheduleRows handles null company_name', () => {
  const rows = buildScheduleRows(
    { email: 'test@example.com', company_name: null },
    'lead-1',
    'vapi_followup',
    {},
    new Date('2026-03-10T10:00:00Z'),
  );
  assertEquals(rows[0].recipient_name, null);
});

Deno.test('buildScheduleRows passes empty context when none provided', () => {
  const rows = buildScheduleRows(
    { email: 'test@example.com', company_name: 'Acme' },
    'lead-1',
    'vapi_followup',
    {},
    new Date('2026-03-10T10:00:00Z'),
  );
  assertEquals(rows[0].context, {});
});
