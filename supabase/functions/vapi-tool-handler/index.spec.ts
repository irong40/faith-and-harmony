// VAPI Tool Handler Edge Function Tests
// Phase 2: Vapi Voice Bot (VBOT-07)
// Co-located Deno tests for get_package_pricing handler logic

import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { handleGetPackagePricing, formatPriceAsWords } from './index.ts';

// ---- formatPriceAsWords unit tests ----

Deno.test('formatPriceAsWords(225) returns "two hundred twenty five dollars"', () => {
  assertEquals(formatPriceAsWords(225), 'two hundred twenty five dollars');
});

Deno.test('formatPriceAsWords(450, "/visit") returns "four hundred fifty dollars per visit"', () => {
  assertEquals(formatPriceAsWords(450, '/visit'), 'four hundred fifty dollars per visit');
});

Deno.test('formatPriceAsWords(750) returns "seven hundred fifty dollars"', () => {
  assertEquals(formatPriceAsWords(750), 'seven hundred fifty dollars');
});

Deno.test('formatPriceAsWords(850) returns "eight hundred fifty dollars"', () => {
  assertEquals(formatPriceAsWords(850), 'eight hundred fifty dollars');
});

Deno.test('formatPriceAsWords(1200) returns "twelve hundred dollars"', () => {
  assertEquals(formatPriceAsWords(1200), 'twelve hundred dollars');
});

Deno.test('formatPriceAsWords falls back to numeric string for unknown price', () => {
  assertEquals(formatPriceAsWords(9999), '9999 dollars');
});

// ---- handleGetPackagePricing handler tests ----

Deno.test('re_basic returns string containing "Listing Lite" and "two hundred twenty five dollars"', async () => {
  const result = await handleGetPackagePricing({ service_type: 're_basic' });
  assertStringIncludes(result, 'Listing Lite');
  assertStringIncludes(result, 'two hundred twenty five dollars');
});

Deno.test('re_standard returns string containing "Listing Pro" and "four hundred fifty dollars"', async () => {
  const result = await handleGetPackagePricing({ service_type: 're_standard' });
  assertStringIncludes(result, 'Listing Pro');
  assertStringIncludes(result, 'four hundred fifty dollars');
});

Deno.test('re_premium returns string containing "Luxury Listing" and "seven hundred fifty dollars"', async () => {
  const result = await handleGetPackagePricing({ service_type: 're_premium' });
  assertStringIncludes(result, 'Luxury Listing');
  assertStringIncludes(result, 'seven hundred fifty dollars');
});

Deno.test('construction returns string containing "Construction Progress" and "four hundred fifty dollars per visit"', async () => {
  const result = await handleGetPackagePricing({ service_type: 'construction' });
  assertStringIncludes(result, 'Construction Progress');
  assertStringIncludes(result, 'four hundred fifty dollars per visit');
});

Deno.test('commercial returns string containing "Commercial Marketing" and "eight hundred fifty dollars"', async () => {
  const result = await handleGetPackagePricing({ service_type: 'commercial' });
  assertStringIncludes(result, 'Commercial Marketing');
  assertStringIncludes(result, 'eight hundred fifty dollars');
});

Deno.test('inspection returns string containing "Inspection Data" and "twelve hundred dollars"', async () => {
  const result = await handleGetPackagePricing({ service_type: 'inspection' });
  assertStringIncludes(result, 'Inspection Data');
  assertStringIncludes(result, 'twelve hundred dollars');
});

Deno.test('missing service_type returns string containing "which service"', async () => {
  const result = await handleGetPackagePricing({});
  assertStringIncludes(result, 'which service');
});

Deno.test('unknown service_type returns string containing "I do not have pricing"', async () => {
  const result = await handleGetPackagePricing({ service_type: 'unknown' });
  assertStringIncludes(result, 'I do not have pricing');
});
