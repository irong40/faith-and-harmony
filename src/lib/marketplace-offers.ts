// -------------------------------------------------------
// Marketplace Offers (zeitview_jobs) shared types + helpers
//
// `zeitview_jobs` is not yet in the generated Supabase types, so we
// declare a local row shape here. Queries use the `(supabase as never)`
// escape hatch, matching the pattern already used for `leads` /
// `lead_notes` in src/pages/admin/Leads.tsx.
// -------------------------------------------------------

export type OfferStatus =
  | "offered"
  | "declined"
  | "accepted"
  | "received"
  | "not_awarded";

export type OfferSource = "zeitview" | "flyguys";

export interface ZeitviewJob {
  id: string;
  gmail_id: string | null;
  source: OfferSource;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  flight_date: string | null;
  flight_time_start: string | null;
  flight_time_end: string | null;
  payout: number | null;
  partner_name: string | null;
  shot_list: string | null;
  instructions: string | null;
  upload_deadline: string | null;
  status: OfferStatus;
  notes: string | null;
  direct_equiv_price: number | null;
  direct_equiv_package: string | null;
  drone_job_id: string | null;
  decided_at: string | null;
  awarded_outcome_at: string | null;
  created_at: string;
}

// Fallback package figures (used if drone_packages query is unavailable).
// Mirrors the live catalog described in the feature brief.
export const FALLBACK_PACKAGES: Record<string, { name: string; price: number | null }> = {
  listing_lite: { name: "Real Estate Listing Lite", price: 225 },
  listing_pro: { name: "Real Estate Listing Pro", price: 450 },
  luxury: { name: "Real Estate Luxury", price: 750 },
  commercial: { name: "Commercial Marketing", price: 850 },
  construction: { name: "Construction", price: 450 },
  inspection: { name: "Inspection", price: null },
  roof: { name: "Roof Inspection", price: null },
  solar: { name: "Solar Inspection", price: null },
  insurance: { name: "Insurance Inspection", price: null },
  survey: { name: "Survey / Mapping", price: null },
  mapping: { name: "Survey / Mapping", price: null },
};

export interface DirectEquivalent {
  // Internal package key used for the fallback table / display label.
  key: string;
  // Human-readable package name (e.g. "Commercial Marketing").
  packageName: string;
  // Resolved price; null means "n/a" (price unset for that category).
  price: number | null;
  // Matched drone_packages category, for writing back / live price lookup.
  category: string;
  // board take = direct-equivalent price - marketplace payout (null if price n/a).
  boardTake: number | null;
}

interface KeywordRule {
  // Lowercased keywords that trigger this mapping.
  keywords: string[];
  // Fallback-table key.
  key: string;
  // drone_packages.category to match against for a live price.
  category: string;
}

// Ordered most-specific -> least-specific. First matching rule wins.
const KEYWORD_RULES: KeywordRule[] = [
  // Inspection / technical families (price often unset -> "n/a")
  { keywords: ["roof"], key: "roof", category: "roof" },
  { keywords: ["solar"], key: "solar", category: "solar" },
  { keywords: ["insurance"], key: "insurance", category: "insurance" },
  { keywords: ["survey", "mapping"], key: "survey", category: "survey" },
  { keywords: ["inspection"], key: "inspection", category: "inspection" },
  // Construction
  { keywords: ["construction", "site", "progress"], key: "construction", category: "construction" },
  // Commercial / marketing
  { keywords: ["hotel", "commercial", "business", "marketing"], key: "commercial", category: "commercial" },
  // Real estate tiers
  { keywords: ["luxury", "estate"], key: "luxury", category: "real_estate" },
  { keywords: ["lite", "small"], key: "listing_lite", category: "real_estate" },
  { keywords: ["home", "residential", "listing", "realtor", "real estate"], key: "listing_pro", category: "real_estate" },
];

const DEFAULT_RULE: KeywordRule = { keywords: [], key: "listing_pro", category: "real_estate" };

// Map a fallback key to a specific drone_packages code for precise live-price lookup.
const KEY_TO_PACKAGE_CODE: Record<string, string> = {
  listing_lite: "listing_lite",
  listing_pro: "listing_pro",
  luxury: "luxury",
  commercial: "commercial",
  construction: "construction",
};

export interface PackagePrice {
  code: string;
  category: string;
  name: string;
  price: number;
}

/**
 * Classify an offer to a direct-mission-equivalent package using keyword
 * matching across shot_list / instructions / partner_name / address.
 *
 * Pure function — easy to unit test. Optionally pass live drone_packages
 * rows to resolve the price; otherwise falls back to the documented figures.
 */
export function computeDirectEquivalent(
  offer: Pick<
    ZeitviewJob,
    "shot_list" | "instructions" | "partner_name" | "address" | "payout"
  >,
  packages?: PackagePrice[]
): DirectEquivalent {
  const haystack = [
    offer.shot_list,
    offer.instructions,
    offer.partner_name,
    offer.address,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    // Collapse the common phrase "real estate" to a single token so the
    // luxury-tier keyword "estate" cannot false-match inside it.
    .replace(/real\s+estate/g, "real_estate");

  // Word-boundary aware match so keywords don't match inside larger words.
  const matchesKeyword = (kw: string): boolean => {
    const normalized = kw.replace(/real\s+estate/g, "real_estate");
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(haystack);
  };

  const rule =
    KEYWORD_RULES.find((r) => r.keywords.some(matchesKeyword)) ?? DEFAULT_RULE;

  const fallback = FALLBACK_PACKAGES[rule.key] ?? FALLBACK_PACKAGES.listing_pro;

  // Try to resolve a live price.
  let price: number | null = fallback.price;
  let packageName = fallback.name;

  if (packages && packages.length > 0) {
    const wantedCode = KEY_TO_PACKAGE_CODE[rule.key];
    const byCode = wantedCode
      ? packages.find((p) => p.code === wantedCode)
      : undefined;
    const byCategory = packages.find((p) => p.category === rule.category);
    const match = byCode ?? byCategory;
    if (match) {
      price = match.price;
      packageName = match.name;
    }
  }

  const payout = offer.payout ?? 0;
  const boardTake = price == null ? null : Math.round((price - payout) * 100) / 100;

  return {
    key: rule.key,
    packageName,
    price,
    category: rule.category,
    boardTake,
  };
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  offered: "Awaiting Decision",
  accepted: "Accepted — Awaiting Board",
  received: "Job Received",
  declined: "Declined",
  not_awarded: "Not Awarded",
};

export const OFFER_STATUS_COLORS: Record<OfferStatus, string> = {
  offered: "bg-amber-500 text-white",
  accepted: "bg-blue-500 text-white",
  received: "bg-green-600 text-white",
  declined: "bg-gray-400 text-white",
  not_awarded: "bg-gray-400 text-white",
};

export const SOURCE_LABELS: Record<OfferSource, string> = {
  zeitview: "Zeitview",
  flyguys: "FlyGuys",
};

export const SOURCE_COLORS: Record<OfferSource, string> = {
  zeitview: "bg-sky-600 text-white",
  flyguys: "bg-orange-600 text-white",
};

// Order in which status groups are rendered on the panel.
export const OFFER_STATUS_ORDER: OfferStatus[] = [
  "offered",
  "accepted",
  "received",
  "not_awarded",
  "declined",
];
