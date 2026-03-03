// Intake Lead Edge Function Tests
// Phase 1: Intake API and Lead Tracking (INTAKE-03)
// Co-located Deno tests for intake-lead pure logic functions
// These tests validate auth, validation, and phone normalization
// without requiring a live database connection.

import { assertEquals, assert } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import {
  validateWebhookSecret,
  validateRequiredFields,
  normalizePhone,
  REQUIRED_FIELDS,
} from './index.ts';

// ---- validateWebhookSecret ----

Deno.test('validateWebhookSecret returns false when header is null', () => {
  assertEquals(validateWebhookSecret(null, 'secret123'), false);
});

Deno.test('validateWebhookSecret returns false when header does not match secret', () => {
  assertEquals(validateWebhookSecret('wrong-secret', 'secret123'), false);
});

Deno.test('validateWebhookSecret returns true when header matches secret', () => {
  assertEquals(validateWebhookSecret('secret123', 'secret123'), true);
});

Deno.test('validateWebhookSecret returns false when env secret is empty', () => {
  assertEquals(validateWebhookSecret('anything', ''), false);
});

// ---- validateRequiredFields ----

Deno.test('validateRequiredFields returns valid=false with missing fields when caller_name is absent', () => {
  const result = validateRequiredFields({
    caller_phone: '7575551234',
    service_type: 're_basic',
    job_description: 'Need aerial photos',
    call_id: 'call-001',
  });
  assertEquals(result.valid, false);
  assert(result.missing.includes('caller_name'));
});

Deno.test('validateRequiredFields returns valid=false when multiple fields are missing', () => {
  const result = validateRequiredFields({
    caller_name: 'Test Caller',
  });
  assertEquals(result.valid, false);
  assert(result.missing.length >= 3);
  assert(result.missing.includes('caller_phone'));
  assert(result.missing.includes('service_type'));
  assert(result.missing.includes('job_description'));
  assert(result.missing.includes('call_id'));
});

Deno.test('validateRequiredFields returns valid=true when all required fields are present', () => {
  const result = validateRequiredFields({
    caller_name: 'Test Caller',
    caller_phone: '7575551234',
    service_type: 're_basic',
    job_description: 'Need aerial photos of a residential property',
    call_id: 'call-001',
  });
  assertEquals(result.valid, true);
  assertEquals(result.missing.length, 0);
});

Deno.test('validateRequiredFields treats empty string as missing', () => {
  const result = validateRequiredFields({
    caller_name: '',
    caller_phone: '7575551234',
    service_type: 're_basic',
    job_description: 'Need aerial photos',
    call_id: 'call-001',
  });
  assertEquals(result.valid, false);
  assert(result.missing.includes('caller_name'));
});

// ---- normalizePhone ----

Deno.test('normalizePhone strips +1 prefix and non-digits from E.164 format', () => {
  assertEquals(normalizePhone('+17575551234'), '17575551234');
});

Deno.test('normalizePhone handles already clean numbers', () => {
  assertEquals(normalizePhone('7575551234'), '7575551234');
});

Deno.test('normalizePhone strips parentheses and dashes', () => {
  assertEquals(normalizePhone('(757) 555-1234'), '7575551234');
});

Deno.test('normalizePhone handles spaces and dots', () => {
  assertEquals(normalizePhone('757.555.1234'), '7575551234');
});

// ---- REQUIRED_FIELDS constant ----

Deno.test('REQUIRED_FIELDS has exactly 5 entries', () => {
  assertEquals(REQUIRED_FIELDS.length, 5);
  assert(REQUIRED_FIELDS.includes('caller_name'));
  assert(REQUIRED_FIELDS.includes('caller_phone'));
  assert(REQUIRED_FIELDS.includes('service_type'));
  assert(REQUIRED_FIELDS.includes('job_description'));
  assert(REQUIRED_FIELDS.includes('call_id'));
});
