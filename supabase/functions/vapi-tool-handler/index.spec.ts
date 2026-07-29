// VAPI Tool Handler Edge Function Tests
// Phase 2: Vapi Voice Bot (VBOT-07)
// Co-located Deno tests for get_package_pricing handler logic
//
// Rewritten 2026-07-28. The previous version asserted a hardcoded PACKAGES map
// against itself, so it stayed green while the map drifted away from the live
// drone_packages catalogue and started quoting a $1,200 package that does not
// exist. These tests feed the handler a stub catalogue instead, so what is under
// test is the RESHAPING of database rows into speech — the part that can be
// wrong — not a table restating its own contents.

import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { handleGetPackagePricing, formatPriceAsWords } from './index.ts';

// Mirrors the live catalogue's shape as of 2026-07-28: flat-price real-estate
// packages plus quote-based (price 0) inspection work, and one inactive row
// that must never be quoted.
const CATALOGUE = [
  { code: 'ROOF_INSPECTION', name: 'Roof Inspection', price: 0, service_type: 'roof_inspection', features: ['Grid photography coverage', 'Annotated damage report'], active: true },
  { code: 'LISTING_LITE_225', name: 'Listing Lite', price: 225, service_type: 're_aerial', features: ['10 edited photos', 'Sky replacement'], active: true },
  { code: 'CONSTRUCTION_450', name: 'Construction Progress', price: 450, service_type: 'construction', features: ['25 labeled photos'], active: true },
  { code: 'LUXURY_750', name: 'Luxury Listing', price: 750, service_type: 're_aerial', features: ['40+ edited photos'], active: true },
  { code: 'PREMIUM_1250', name: 'Premium Residential', price: 1250, service_type: 're_aerial', features: ['Retired tier'], active: false },
];

/** Minimal stand-in for the PostgREST builder chain the handler uses. */
function stubSupabase(opts: { rows?: typeof CATALOGUE; error?: unknown } = {}) {
  const rows = opts.rows ?? CATALOGUE;
  return {
    from() {
      const chain = {
        select: () => chain,
        eq: (col: string, val: unknown) => {
          if (col === 'active') chain._rows = chain._rows.filter((r) => r.active === val);
          return chain;
        },
        order: (col: string, o: { ascending: boolean }) => {
          chain._rows = [...chain._rows].sort((a, b) =>
            o.ascending ? (a as never)[col] - (b as never)[col] : (b as never)[col] - (a as never)[col]);
          return Promise.resolve(
            opts.error ? { data: null, error: opts.error } : { data: chain._rows, error: null });
        },
        _rows: [...rows],
      };
      return chain;
    },
  };
}

// ---- formatPriceAsWords ----

Deno.test('formatPriceAsWords(225)', () => {
  assertEquals(formatPriceAsWords(225), 'two hundred twenty five dollars');
});

Deno.test('formatPriceAsWords(450, "/visit") speaks the unit', () => {
  assertEquals(formatPriceAsWords(450, '/visit'), 'four hundred fifty dollars per visit');
});

Deno.test('formatPriceAsWords(750)', () => {
  assertEquals(formatPriceAsWords(750), 'seven hundred fifty dollars');
});

Deno.test('formatPriceAsWords(1200) uses the colloquial hundreds form', () => {
  assertEquals(formatPriceAsWords(1200), 'twelve hundred dollars');
});

// The regression that mattered: the old version fell back to String(price) for
// anything outside its five-entry table, so a new catalogue price would be read
// down the phone as a bare numeral.
Deno.test('formatPriceAsWords spells a price it has never seen — no bare numerals', () => {
  assertEquals(formatPriceAsWords(1350), 'one thousand three hundred fifty dollars');
  assertEquals(formatPriceAsWords(9999), 'nine thousand nine hundred ninety nine dollars');
  assertEquals(formatPriceAsWords(75), 'seventy five dollars');
});

// ---- handleGetPackagePricing ----

Deno.test('legacy key re_basic still resolves to the live Listing Lite row', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 're_basic' });
  assertStringIncludes(result, 'Listing Lite');
  assertStringIncludes(result, 'two hundred twenty five dollars');
});

Deno.test('a code resolves directly', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 'LUXURY_750' });
  assertStringIncludes(result, 'Luxury Listing');
  assertStringIncludes(result, 'seven hundred fifty dollars');
});

Deno.test('quote-based work is never spoken as a dollar amount', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 'roof_inspection' });
  assertStringIncludes(result, 'Roof Inspection');
  assertStringIncludes(result, 'custom quote');
  assertEquals(result.includes('zero dollars'), false);
  assertEquals(/\d/.test(result), false);
});

Deno.test('a service_type matching several packages lists them all, cheapest first', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 're_aerial' });
  assertStringIncludes(result, 'Listing Lite');
  assertStringIncludes(result, 'Luxury Listing');
  assertEquals(result.indexOf('Listing Lite') < result.indexOf('Luxury Listing'), true);
});

Deno.test('inactive packages are never quoted', async () => {
  const all = await handleGetPackagePricing(stubSupabase(), { service_type: 're_aerial' });
  assertEquals(all.includes('Premium Residential'), false);
  const direct = await handleGetPackagePricing(stubSupabase(), { service_type: 'PREMIUM_1250' });
  assertEquals(direct.includes('twelve hundred fifty dollars'), false);
});

Deno.test('the retired $1,200 Inspection Data package is gone, not restated', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 'inspection' });
  assertEquals(result.includes('Inspection Data'), false);
  assertEquals(result.includes('twelve hundred'), false);
});

Deno.test('missing service_type asks which service', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), {});
  assertStringIncludes(result, 'which service');
});

Deno.test('unknown service_type lists the live package names', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 'unknown' });
  assertStringIncludes(result, 'I do not have pricing');
  assertStringIncludes(result, 'Listing Lite');
});

Deno.test('a failed query hands off — it never falls back to a literal price', async () => {
  const result = await handleGetPackagePricing(
    stubSupabase({ error: { message: 'boom' } }), { service_type: 're_basic' });
  assertStringIncludes(result, 'call you back');
  assertEquals(/\d/.test(result), false);
});
