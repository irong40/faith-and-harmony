/**
 * Shared drone_packages resolution.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * Two functions in the same voice-order path used to resolve a caller's
 * service_type against drone_packages using DIFFERENT keys:
 *
 *   vapi-tool-handler.handleGetPackagePricing  ->  code / service_type / name
 *   intake-lead (step 5)                       ->  category / code
 *
 * Only `code` was common to both. So a value that resolved through
 * `service_type` (e.g. "property_survey") priced correctly on the phone and
 * then matched NOTHING at job-creation time, where it fell through to a
 * "cheapest active package" fallback and silently bound the wrong package.
 * Verified live 2026-08-14: service_type='property_survey' matched zero
 * packages in intake-lead.
 *
 * The defect was that this logic existed twice and drifted. So it now exists
 * once, here, and both callers import it. Do not re-implement matching in a
 * caller — extend this file instead.
 *
 * DESIGN NOTES
 * ------------
 * - Pure. Takes rows, returns rows. No database handle, no network. That is
 *   deliberate: the part that can be wrong is the MATCHING, and matching is
 *   testable without a database.
 * - Matching runs in memory over the active catalogue rather than as a
 *   PostgREST filter. That removes the `.or()` string-interpolation surface
 *   entirely, which is the same hardening findOrCreateClient already applies
 *   to phone lookups. Caller-supplied text must never be concatenated into a
 *   PostgREST filter expression. The live catalogue is a handful of rows, so
 *   filtering client-side costs nothing.
 * - Both callers must select the SAME columns, or matching silently degrades
 *   (a caller that forgets `category` can never match by category). Use
 *   PACKAGE_SELECT_COLUMNS so that cannot drift either.
 */

/**
 * Legacy service_type keys the assistant may still send.
 *
 * These were the keys of a hardcoded PACKAGES map that lived in
 * vapi-tool-handler until 2026-07-28. They are NOT columns in drone_packages,
 * so an assistant still sending them has to be translated to a real `code` or
 * it resolves to nothing.
 *
 * `inspection` is deliberately absent. The old map priced it at $1,200 under
 * the name "Inspection Data", and no package by that name exists in the live
 * catalogue. Leaving it out means "inspection" resolves through the normal key
 * order below against real rows instead of a remembered price.
 *
 * This map lives here rather than in vapi-tool-handler because intake-lead
 * receives the SAME service_type string the assistant used. If only the phone
 * side translated legacy keys, the two sides would diverge again on exactly
 * the inputs this map covers.
 */
export const LEGACY_KEY_TO_CODE: Record<string, string> = {
  re_basic: 'LISTING_LITE_225',
  re_standard: 'LISTING_PRO_450',
  re_premium: 'LUXURY_750',
  construction: 'CONSTRUCTION_450',
  commercial: 'COMMERCIAL_850',
};

/**
 * The columns every caller must select for resolution to work.
 * Selecting fewer silently weakens matching.
 */
export const PACKAGE_SELECT_COLUMNS =
  'id, code, name, price, service_type, category, features';

/**
 * Resolution order. First key that yields any match wins; later keys are not
 * consulted. Ordered most specific to least: an exact `code` beats a shared
 * `service_type`, which beats a coarse `category` bucket, which beats a
 * human-facing `name`.
 */
export const PACKAGE_MATCH_KEYS = [
  'code',
  'service_type',
  'category',
  'name',
] as const;

export type PackageMatchKey = typeof PACKAGE_MATCH_KEYS[number];

export type PackageRow = {
  id?: string;
  code?: string | null;
  name?: string | null;
  price?: number | null;
  service_type?: string | null;
  category?: string | null;
  features?: string[] | null;
  active?: boolean;
};

export type PackageResolution<T extends PackageRow> = {
  /** All rows matching on the winning key, in the order supplied. */
  matches: T[];
  /** The key that produced the match, or null when nothing matched. */
  matchedOn: PackageMatchKey | null;
  /** The value actually searched for, after legacy translation + normalizing. */
  normalizedKey: string | null;
  /** True when the legacy map rewrote the caller's value. */
  usedLegacyMap: boolean;
};

function norm(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed === '' ? null : trimmed;
}

/**
 * Resolve a caller-supplied service_type against a set of package rows.
 *
 * Callers are expected to pass ONLY active rows, ordered however they want the
 * matches ordered (both current callers order by price ascending, so a tie
 * across several genuine matches resolves to the cheapest MATCHING package —
 * which is also the first one Paula reads aloud).
 *
 * Returns an empty `matches` array when nothing matches. There is deliberately
 * no fallback: a caller that wants one has to write it and own it. The bug
 * this file replaces was a silent "cheapest active package" fallback that
 * looked exactly like a successful match to everything downstream.
 */
export function resolvePackages<T extends PackageRow>(
  rows: T[] | null | undefined,
  serviceType: string | null | undefined,
): PackageResolution<T> {
  const asked = norm(serviceType);
  if (!asked) {
    return { matches: [], matchedOn: null, normalizedKey: null, usedLegacyMap: false };
  }

  const mapped = norm(LEGACY_KEY_TO_CODE[asked]);
  const wanted = mapped ?? asked;
  const usedLegacyMap = mapped !== null && mapped !== asked;

  const safeRows = Array.isArray(rows) ? rows : [];

  for (const key of PACKAGE_MATCH_KEYS) {
    const matches = safeRows.filter((row) => norm(row[key]) === wanted);
    if (matches.length > 0) {
      return { matches, matchedOn: key, normalizedKey: wanted, usedLegacyMap };
    }
  }

  return { matches: [], matchedOn: null, normalizedKey: wanted, usedLegacyMap };
}

/**
 * Convenience wrapper for callers that only need the single package to bind.
 * Returns null when nothing matched — callers MUST handle null rather than
 * substituting a default.
 */
export function resolveSinglePackage<T extends PackageRow>(
  rows: T[] | null | undefined,
  serviceType: string | null | undefined,
): T | null {
  return resolvePackages(rows, serviceType).matches[0] ?? null;
}
