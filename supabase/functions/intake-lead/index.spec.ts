// Intake Lead Edge Function Tests
// Phase 1: Intake API and Lead Tracking (INTAKE-03)
// Co-located Deno tests for intake-lead pure logic functions
// These tests validate auth, validation, and phone normalization
// without requiring a live database connection.

import { assertEquals, assert, assertStringIncludes } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import {
  validateWebhookSecret,
  validateRequiredFields,
  normalizePhone,
  buildDroneJobInsert,
  REQUIRED_FIELDS,
  type IntakePayload,
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

// ---- buildDroneJobInsert ----
//
// Covers the two production defects found in the live end-to-end test on
// 2026-08-14:
//   1. drone_jobs.client_id was never set, so Paula's lookup_customer (which
//      queries drone_jobs by client_id) could not see the job she had just
//      booked and told returning callers "No active jobs".
//   2. intake-lead matched packages on category/code while Paula matched on
//      code/service_type/name. Anything resolving through service_type or name
//      matched nothing here and fell through to the cheapest active package.

const CLIENT_ID = '11111111-1111-4111-8111-111111111111';
const CUSTOMER_ID = '22222222-2222-4222-8222-222222222222';

/** Mirrors the live active catalogue, verified against drone_packages 2026-08-14. */
const ACTIVE_CATALOGUE = [
  { id: 'pkg-land', code: 'LAND_SURVEY', name: 'Land Survey and Mapping', price: 0, service_type: 'property_survey', category: 'survey' },
  { id: 'pkg-lite', code: 'LISTING_LITE_225', name: 'Listing Lite', price: 225, service_type: 're_aerial', category: 'real_estate' },
  { id: 'pkg-constr', code: 'CONSTRUCTION_450', name: 'Construction Progress', price: 450, service_type: 'construction', category: 'construction' },
  { id: 'pkg-pro', code: 'LISTING_PRO_450', name: 'Listing Pro', price: 450, service_type: 're_aerial', category: 'real_estate' },
  { id: 'pkg-lux', code: 'LUXURY_750', name: 'Luxury Listing', price: 750, service_type: 're_aerial', category: 'real_estate' },
  { id: 'pkg-roof', code: 'ROOF_INSPECTION', name: 'Roof Inspection', price: 1200, service_type: 'roof_inspection', category: 'inspection' },
];

function payload(overrides: Partial<IntakePayload> = {}): IntakePayload {
  return {
    caller_name: 'Test Caller',
    caller_phone: '7575551234',
    service_type: 'property_survey',
    job_description: 'Need a survey of a vacant parcel',
    call_id: 'call-001',
    ...overrides,
  };
}

function build(service_type: string, packages = ACTIVE_CATALOGUE) {
  return buildDroneJobInsert({
    payload: payload({ service_type }),
    client_id: CLIENT_ID,
    customer_id: CUSTOMER_ID,
    packages,
  });
}

// ---- Defect 1: client_id ----

Deno.test('the drone_job insert carries client_id, not just customer_id', () => {
  const { insert } = build('property_survey');
  assertEquals(insert.client_id, CLIENT_ID);
  assertEquals(insert.customer_id, CUSTOMER_ID);
});

Deno.test('client_id is still set when no package matches', () => {
  // The review path must not drop the FK Paula reads on.
  const { insert } = build('something-nobody-configured');
  assertEquals(insert.client_id, CLIENT_ID);
});

// ---- Defect 2: one resolution order, shared with Paula ----

Deno.test('service_type=LAND_SURVEY binds LAND_SURVEY (code match)', () => {
  const { insert, matchedOn, matchedCode } = build('LAND_SURVEY');
  assertEquals(insert.package_id, 'pkg-land');
  assertEquals(matchedOn, 'code');
  assertEquals(matchedCode, 'LAND_SURVEY');
  assertEquals(insert.status, 'intake');
});

Deno.test('service_type=property_survey binds LAND_SURVEY (service_type match — the path that was broken)', () => {
  // Before the fix this matched ZERO packages, because intake-lead only
  // looked at category and code. Verified against live data 2026-08-14.
  const { insert, matchedOn, matchedCode } = build('property_survey');
  assertEquals(insert.package_id, 'pkg-land');
  assertEquals(matchedOn, 'service_type');
  assertEquals(matchedCode, 'LAND_SURVEY');
  assertEquals(insert.status, 'intake');
});

Deno.test('service_type=survey binds LAND_SURVEY (category match)', () => {
  const { insert, matchedOn, matchedCode } = build('survey');
  assertEquals(insert.package_id, 'pkg-land');
  assertEquals(matchedOn, 'category');
  assertEquals(matchedCode, 'LAND_SURVEY');
});

Deno.test('matching is case and whitespace insensitive', () => {
  assertEquals(build('  Property_Survey  ').insert.package_id, 'pkg-land');
  assertEquals(build('land_survey').insert.package_id, 'pkg-land');
});

Deno.test('a legacy assistant key resolves the same way it does on the phone', () => {
  // re_basic is not a column value anywhere; the shared legacy map turns it
  // into LISTING_LITE_225. If this map lived only in vapi-tool-handler, Paula
  // would quote Listing Lite and intake-lead would bind nothing.
  const { insert, matchedOn, matchedCode } = build('re_basic');
  assertEquals(insert.package_id, 'pkg-lite');
  assertEquals(matchedOn, 'code');
  assertEquals(matchedCode, 'LISTING_LITE_225');
});

// ---- Defect 2: no silent fallback ----

Deno.test('an unrecognised service_type leaves package_id null and flags for review', () => {
  const { insert, matchedOn, matchedCode } = build('thermal_roof_scan');
  assertEquals(insert.package_id, null);
  assertEquals(matchedOn, null);
  assertEquals(matchedCode, null);
  assertEquals(insert.status, 'review_pending');
  // The reason has to be on the record, not only in a log line.
  assertStringIncludes(insert.admin_notes, 'NEEDS REVIEW');
  assertStringIncludes(insert.admin_notes, 'thermal_roof_scan');
});

/**
 * THE IMPORTANT ONE.
 *
 * The old code fell through to `.eq('active',true).order('price').limit(1)` —
 * the cheapest active package. Today that lands on LAND_SURVEY, which is
 * priced 0, so the bug is currently harmless BY ACCIDENT.
 *
 * A test that used the live catalogue would therefore pass even with the bug
 * present. So this fixture has NO zero-priced row: the cheapest active package
 * is a real $225 one. If anyone reinstates a cheapest-active fallback, an
 * unmatched service_type will bind Listing Lite and this test fails — which is
 * exactly the production scenario that is waiting to happen the moment
 * LAND_SURVEY gets a real price or a cheaper package is added.
 */
const PRICED_CATALOGUE = [
  { id: 'pkg-lite', code: 'LISTING_LITE_225', name: 'Listing Lite', price: 225, service_type: 're_aerial', category: 'real_estate' },
  { id: 'pkg-constr', code: 'CONSTRUCTION_450', name: 'Construction Progress', price: 450, service_type: 'construction', category: 'construction' },
  { id: 'pkg-roof', code: 'ROOF_INSPECTION', name: 'Roof Inspection', price: 1200, service_type: 'roof_inspection', category: 'inspection' },
];

Deno.test('an unmatched service_type does NOT bind the cheapest package, even when the cheapest is priced', () => {
  const cheapest = PRICED_CATALOGUE.reduce((a, b) => (a.price <= b.price ? a : b));
  assertEquals(cheapest.id, 'pkg-lite');
  assert(cheapest.price > 0, 'fixture must not rely on a zero-priced cheapest row');

  const { insert } = build('property_survey', PRICED_CATALOGUE);

  assertEquals(insert.package_id, null);
  assertEquals(insert.package_id === cheapest.id, false);
  assertEquals(insert.status, 'review_pending');
  assertStringIncludes(insert.admin_notes, 'property_survey');
});

Deno.test('every unmatched service_type in a priced catalogue is flagged, none are silently bound', () => {
  for (const st of ['property_survey', 'survey', 'solar', 'insurance', 'unknown_service']) {
    const { insert } = build(st, PRICED_CATALOGUE);
    assertEquals(insert.package_id, null, `"${st}" should not bind a package`);
    assertEquals(insert.status, 'review_pending', `"${st}" should be flagged`);
  }
});

Deno.test('a failed catalogue query flags for review rather than guessing', () => {
  const { insert } = buildDroneJobInsert({
    payload: payload({ service_type: 'property_survey' }),
    client_id: CLIENT_ID,
    customer_id: CUSTOMER_ID,
    packages: null,
    packagesUnavailable: true,
  });
  assertEquals(insert.package_id, null);
  assertEquals(insert.status, 'review_pending');
  assertEquals(insert.client_id, CLIENT_ID);
  assertStringIncludes(insert.admin_notes, 'NEEDS REVIEW');
});

Deno.test('a matched job keeps the original note and is NOT flagged for review', () => {
  const { insert } = build('LAND_SURVEY');
  assertStringIncludes(insert.admin_notes, 'Voice order via Vapi');
  assertStringIncludes(insert.admin_notes, 'call-001');
  assertEquals(insert.admin_notes.includes('NEEDS REVIEW'), false);
});

Deno.test('property_address falls back to a placeholder naming the caller', () => {
  const { insert } = build('LAND_SURVEY');
  assertStringIncludes(insert.property_address, 'Test Caller');
  assertEquals(insert.scheduled_date, null);
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
