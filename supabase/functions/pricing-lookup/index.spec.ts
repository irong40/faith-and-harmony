// Pricing Lookup Edge Function Tests
// Phase 1: Intake API and Lead Tracking (INTAKE-04)
// Co-located Deno tests for pricing-lookup handler logic

import { assertEquals, assertExists } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { handleRequest, PACKAGES, ADD_ONS } from './index.ts';

// Helper to create a Request object
function makeRequest(url: string, method = 'GET'): Request {
  return new Request(url, { method });
}

Deno.test('OPTIONS request returns 200 with CORS headers', async () => {
  const req = makeRequest('http://localhost/pricing-lookup', 'OPTIONS');
  const res = handleRequest(req);
  assertEquals(res.status, 200);
  assertExists(res.headers.get('Access-Control-Allow-Origin'));
});

Deno.test('GET with service_type=re_basic returns 200 with Listing Lite at $225', async () => {
  const req = makeRequest('http://localhost/pricing-lookup?service_type=re_basic');
  const res = handleRequest(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.name, 'Listing Lite');
  assertEquals(body.price, 225);
  assertEquals(body.service_type, 're_basic');
  assertEquals(body.deliverables.length, 3);
});

Deno.test('GET with service_type=re_standard returns 200 with price 450', async () => {
  const req = makeRequest('http://localhost/pricing-lookup?service_type=re_standard');
  const res = handleRequest(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.price, 450);
  assertEquals(body.name, 'Listing Pro');
});

Deno.test('GET without service_type returns all 6 packages and add-ons', async () => {
  const req = makeRequest('http://localhost/pricing-lookup');
  const res = handleRequest(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertExists(body.packages);
  assertExists(body.add_ons);
  assertEquals(Object.keys(body.packages).length, 6);
  assertEquals(Object.keys(body.add_ons).length, 4);
});

Deno.test('GET with unknown service_type returns 404', async () => {
  const req = makeRequest('http://localhost/pricing-lookup?service_type=unknown');
  const res = handleRequest(req);
  assertEquals(res.status, 404);
  const body = await res.json();
  assertExists(body.error);
});

Deno.test('POST request returns 405', async () => {
  const req = makeRequest('http://localhost/pricing-lookup', 'POST');
  const res = handleRequest(req);
  assertEquals(res.status, 405);
  const body = await res.json();
  assertExists(body.error);
});

Deno.test('PACKAGES constant has exactly 6 entries with correct prices', () => {
  const keys = Object.keys(PACKAGES);
  assertEquals(keys.length, 6);
  assertEquals(PACKAGES.re_basic.price, 225);
  assertEquals(PACKAGES.re_standard.price, 450);
  assertEquals(PACKAGES.re_premium.price, 750);
  assertEquals(PACKAGES.construction.price, 450);
  assertEquals(PACKAGES.commercial.price, 850);
  assertEquals(PACKAGES.inspection.price, 1200);
});

Deno.test('ADD_ONS constant has exactly 4 entries', () => {
  const keys = Object.keys(ADD_ONS);
  assertEquals(keys.length, 4);
  assertExists(ADD_ONS.rush_24h);
  assertExists(ADD_ONS.rush_same_day);
  assertExists(ADD_ONS.raw_buyout);
  assertExists(ADD_ONS.brokerage_retainer);
});
