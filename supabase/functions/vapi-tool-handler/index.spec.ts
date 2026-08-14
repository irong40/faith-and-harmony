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

// Mirrors the LIVE catalogue, re-verified against drone_packages on
// 2026-08-14. Two corrections were made that day:
//
//   - every row now carries `category`. The previous fixture omitted it, which
//     meant category-based matching could not be exercised at all — the suite
//     would have stayed green no matter what the resolver did with it.
//   - ROOF_INSPECTION is priced 1200 live, not 0. The old fixture said 0, so
//     this file had quietly drifted from the catalogue in the same way the
//     hardcoded PACKAGES map did before it. LAND_SURVEY is the genuinely
//     quote-based (price 0) active row and is now included as one.
const CATALOGUE = [
  { code: 'LAND_SURVEY', name: 'Land Survey and Mapping', price: 0, service_type: 'property_survey', category: 'survey', features: ['Orthomosaic', 'Boundary overlay'], active: true },
  { code: 'LISTING_LITE_225', name: 'Listing Lite', price: 225, service_type: 're_aerial', category: 'real_estate', features: ['10 edited photos', 'Sky replacement'], active: true },
  { code: 'CONSTRUCTION_450', name: 'Construction Progress', price: 450, service_type: 'construction', category: 'construction', features: ['25 labeled photos'], active: true },
  { code: 'LUXURY_750', name: 'Luxury Listing', price: 750, service_type: 're_aerial', category: 'real_estate', features: ['40+ edited photos'], active: true },
  { code: 'COMMERCIAL_850', name: 'Commercial Marketing', price: 850, service_type: 're_aerial', category: 'commercial', features: ['4K video'], active: true },
  { code: 'ROOF_INSPECTION', name: 'Roof Inspection', price: 1200, service_type: 'roof_inspection', category: 'inspection', features: ['Grid photography coverage', 'Annotated damage report'], active: true },
  { code: 'PREMIUM_1250', name: 'Premium Residential', price: 1250, service_type: 're_aerial', category: 'real_estate', features: ['Retired tier'], active: false },
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

// Retargeted 2026-08-14 from ROOF_INSPECTION to LAND_SURVEY. ROOF_INSPECTION
// is priced 1200 in the live catalogue, so it stopped being an example of
// quote-based work; LAND_SURVEY is the price-0 active row. The behaviour under
// test is unchanged: price 0 means "custom quote", never "zero dollars".
Deno.test('quote-based work is never spoken as a dollar amount', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 'property_survey' });
  assertStringIncludes(result, 'Land Survey and Mapping');
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

// Narrowed 2026-08-14. The original guard also asserted that "twelve hundred"
// never appears. That was right when ROOF_INSPECTION was priced 0 and the only
// source of $1,200 was the deleted hardcoded map. The live catalogue now
// prices ROOF_INSPECTION at 1200, so a blanket ban on that number would forbid
// a correct answer read straight from the database.
//
// What actually must never come back is the RETIRED PACKAGE: a row named
// "Inspection Data" with its own remembered price, invented by this function
// rather than read from drone_packages. That is what is asserted now.
Deno.test('the retired Inspection Data package is gone, not restated', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 'inspection' });
  assertEquals(result.includes('Inspection Data'), false);
});

// Documents a DELIBERATE behaviour change made on 2026-08-14, flagged for
// review before deploy. Aligning intake-lead with Paula required a single
// shared key order (code -> service_type -> category -> name). Adding
// `category` to that order means Paula now answers a bare "inspection" from
// the catalogue instead of declining. The number she speaks is the live
// ROOF_INSPECTION price, not a remembered one — change the row and the
// spoken price changes with it.
Deno.test('category is a valid match key, and the price spoken is the live row price', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 'inspection' });
  assertStringIncludes(result, 'Roof Inspection');
  assertStringIncludes(result, 'twelve hundred dollars');

  // Same query against a catalogue where that row is repriced: the answer
  // must follow the data. If this ever fails, a literal has crept back in.
  const repriced = CATALOGUE.map((r) =>
    r.code === 'ROOF_INSPECTION' ? { ...r, price: 1350 } : r);
  const after = await handleGetPackagePricing(stubSupabase({ rows: repriced }), { service_type: 'inspection' });
  assertStringIncludes(after, 'one thousand three hundred fifty dollars');
  assertEquals(after.includes('twelve hundred'), false);
});

// A precise key must win over a coarse one. 'construction' is BOTH the
// service_type and the category of CONSTRUCTION_450 here, but codes and
// service_types are checked before categories, so the ordering is what pins
// the result rather than luck in row order.
Deno.test('a more precise key wins over category', async () => {
  const result = await handleGetPackagePricing(stubSupabase(), { service_type: 'construction' });
  assertStringIncludes(result, 'Construction Progress');
  assertEquals(result.includes('Roof Inspection'), false);
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
