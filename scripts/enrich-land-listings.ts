#!/usr/bin/env npx tsx
/**
 * enrich-land-listings.ts
 *
 * Scrapes unenriched land_listings via local Firecrawl, extracts structured
 * data from the listing page markdown, re-scores opportunity, and writes
 * everything back to Supabase.
 *
 * Usage:
 *   npx tsx scripts/enrich-land-listings.ts
 *   npx tsx scripts/enrich-land-listings.ts --dry-run
 *   npx tsx scripts/enrich-land-listings.ts --limit 10
 *   npx tsx scripts/enrich-land-listings.ts --dry-run --limit 5
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config & credentials
// ---------------------------------------------------------------------------

const PROJECT_ROOT = resolve(import.meta.dirname ?? __dirname, "..");

function loadEnv(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const text = readFileSync(path, "utf-8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      vars[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  } catch {
    // file not found – that's fine
  }
  return vars;
}

const mainEnv = loadEnv(resolve(PROJECT_ROOT, ".env"));
const procEnv = loadEnv(resolve(PROJECT_ROOT, "processing-server", ".env"));

const SUPABASE_URL = mainEnv.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  procEnv.SUPABASE_SERVICE_ROLE_KEY || mainEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials. Check .env files.");
  process.exit(1);
}

const FIRECRAWL_URL = "http://localhost:3002/v1/scrape";
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;

if (DRY_RUN) console.log("[DRY RUN] No writes will be performed.\n");

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Type for a listing row (minimal)
// ---------------------------------------------------------------------------

interface LandListing {
  id: string;
  title: string;
  source_url: string;
  address: string | null;
  photo_count: number | null;
  listing_agent_name: string | null;
  acreage: number | null;
  price: number | null;
  land_type: string | null;
  is_fsbo: boolean | null;
}

// ---------------------------------------------------------------------------
// Firecrawl scraper
// ---------------------------------------------------------------------------

async function scrapeUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], waitFor: 8000 }),
    });
    if (!resp.ok) {
      console.warn(`  Firecrawl HTTP ${resp.status} for ${url}`);
      return null;
    }
    const json = await resp.json();
    // Firecrawl v1 returns { success, data: { markdown } }
    return json?.data?.markdown ?? json?.markdown ?? null;
  } catch (err: any) {
    console.warn(`  Firecrawl error for ${url}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

function extractAddress(md: string): string | null {
  // Common patterns: "123 Main St, City, ST 12345" or multi-line address blocks
  const patterns = [
    /(\d{1,6}\s+[A-Za-z0-9\s.]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|Hwy|Highway|Pkwy|Parkway|Cir|Circle|Trl|Trail)[.,]?\s*,?\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/i,
    /(\d{1,6}\s+[A-Za-z0-9\s.]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Way|Pl|Place|Hwy|Highway|Pkwy|Parkway|Cir|Circle|Trl|Trail)[.,]?\s*,?\s*[A-Za-z\s]+,\s*[A-Z]{2})/i,
  ];
  for (const pat of patterns) {
    const m = md.match(pat);
    if (m) return m[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

function extractPrice(md: string): number | null {
  // Match $1,234,567 or $1234567
  const m = md.match(/\$\s?([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const val = parseFloat(m[1].replace(/,/g, ""));
  return isNaN(val) ? null : val;
}

function extractAcreage(md: string): number | null {
  // "12.5 acres" or "12.5-acre"
  const acreMatch = md.match(/([\d,.]+)\s*(?:-?\s*)?acre/i);
  if (acreMatch) {
    const val = parseFloat(acreMatch[1].replace(/,/g, ""));
    if (!isNaN(val)) return val;
  }
  // "43,560 sq ft lot" — convert sq ft to acres
  const sqftMatch = md.match(/([\d,]+)\s*(?:sq\.?\s*ft|square\s*feet|SF)\s*(?:lot)?/i);
  if (sqftMatch) {
    const sqft = parseFloat(sqftMatch[1].replace(/,/g, ""));
    if (!isNaN(sqft)) return Math.round((sqft / 43560) * 1000) / 1000;
  }
  return null;
}

function countPhotos(md: string): number {
  // Count markdown image references: ![...](...) and bare image URLs
  const imgTags = (md.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const imgUrls = (
    md.match(/https?:\/\/[^\s)"]+\.(?:jpg|jpeg|png|webp|gif|avif)/gi) || []
  ).length;
  // Deduplicate roughly — images in markdown syntax are also URLs
  return Math.max(imgTags, imgUrls);
}

function hasAerialPhotos(md: string): boolean {
  const aerialKeywords =
    /\b(aerial|drone|bird['\u2019]?s?\s*eye|overhead|satellite|sky\s*view|top[- ]?down)\b/i;
  // Check near image references (within 200 chars)
  const imgPositions = [...md.matchAll(/!\[.*?\]\(.*?\)/g)].map(
    (m) => m.index!
  );
  for (const pos of imgPositions) {
    const context = md.slice(Math.max(0, pos - 200), pos + 300);
    if (aerialKeywords.test(context)) return true;
  }
  // Also check general text
  if (aerialKeywords.test(md)) return true;
  return false;
}

interface AgentInfo {
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
}

function extractAgent(md: string): AgentInfo {
  const info: AgentInfo = { name: null, company: null, phone: null, email: null };

  // Agent / listed by / courtesy of patterns
  const namePatterns = [
    /(?:Listed\s+by|Listing\s+Agent|Agent|Courtesy\s+of|Broker)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
    /(?:Contact|Presented\s+by)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
  ];
  for (const pat of namePatterns) {
    const m = md.match(pat);
    if (m) {
      info.name = m[1].trim();
      break;
    }
  }

  // Company — often after agent name with comma, or "of CompanyName"
  const companyPatterns = [
    /(?:Courtesy\s+of|Brokerage|Office|Company)[:\s]+([A-Za-z0-9\s&.',()-]+?)(?:\n|\.|\||$)/i,
    /(?:Listed\s+by)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\s*[,\-]\s*([A-Za-z0-9\s&.',()-]+?)(?:\n|\.|\||$)/i,
  ];
  for (const pat of companyPatterns) {
    const m = md.match(pat);
    if (m) {
      info.company = m[1].trim().slice(0, 100);
      break;
    }
  }

  // Phone
  const phoneMatch = md.match(
    /(?:phone|tel|call|contact)[:\s]*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/i
  ) || md.match(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/);
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/\D/g, "").slice(-10);
    if (digits.length === 10) {
      info.phone = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
  }

  // Email
  const emailMatch = md.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) info.email = emailMatch[0];

  return info;
}

function extractDescription(md: string): string | null {
  // Strip markdown images and links, then grab first 500 chars of descriptive text
  let text = md
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/[*_]{1,3}/g, "")
    .replace(/\|.*\|/g, "")
    .replace(/[-=]{3,}/g, "");

  // Find a paragraph-like block (50+ chars without a ton of special chars)
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 50);
  if (paragraphs.length === 0) return null;
  const desc = paragraphs[0].replace(/\s+/g, " ").trim();
  return desc.slice(0, 500);
}

function detectLandType(md: string): string | null {
  const lower = md.toLowerCase();
  // Must match land_listings_land_type_check constraint values
  if (/\bfarm\b|\bagricult\b|\bcrop\b/.test(lower)) return "farm_agricultural";
  if (/\bwaterfront\b|\blakefront\b|\briverfront\b|\boceanfront\b/.test(lower))
    return "waterfront";
  if (/\bcommercial\b|\bindustrial\b/.test(lower)) return "commercial";
  if (/\btimber\b|\bwooded\b/.test(lower)) return "timber";
  if (/\bhunting\b|\brecreational\b/.test(lower)) return "recreational";
  if (/\bresidential\s*lot\b|\bhomesite\b|\bbuilding\s*lot\b/.test(lower)) return "residential_lot";
  if (/\bvacant\s*lot\b|\bvacant\s*land\b/.test(lower)) return "vacant_lot";
  if (/\bmixed.?use\b/.test(lower)) return "mixed_use";
  return null;
}

function detectFsbo(md: string): boolean {
  return /\b(FSBO|for\s+sale\s+by\s+owner)\b/i.test(md);
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

interface ScoringInput {
  photoCount: number;
  hasAerial: boolean;
  acreage: number | null;
  price: number | null;
  landType: string | null;
  isFsbo: boolean;
}

interface ScoringResult {
  score: number;
  flags: string[];
  priority: string;
  photoQualityScore: number;
}

function scoreListing(input: ScoringInput): ScoringResult {
  let score = 0;
  const flags: string[] = [];

  // Photo scoring
  let photoQuality = 0;
  if (input.photoCount === 0) {
    score += 35;
    flags.push("no_photos");
    photoQuality = 0;
  } else if (input.photoCount < 3) {
    score += 25;
    flags.push("few_photos");
    photoQuality = 20;
  } else if (input.photoCount < 6) {
    score += 10;
    flags.push("some_photos");
    photoQuality = 50;
  } else {
    photoQuality = 80;
  }

  // Aerial
  if (!input.hasAerial) {
    score += 15;
    flags.push("no_aerial");
  } else {
    photoQuality = Math.min(photoQuality + 20, 100);
  }

  // Acreage
  if (input.acreage !== null) {
    if (input.acreage >= 50) {
      score += 20;
      flags.push("large_parcel");
    } else if (input.acreage >= 10) {
      score += 15;
      flags.push("medium_parcel");
    } else if (input.acreage >= 2) {
      score += 8;
      flags.push("small_parcel");
    }
  }

  // Price
  if (input.price !== null) {
    if (input.price >= 500000) {
      score += 15;
      flags.push("high_value");
    } else if (input.price >= 100000) {
      score += 10;
      flags.push("mid_value");
    } else if (input.price >= 25000) {
      score += 5;
      flags.push("low_value");
    }
  }

  // Land type bonuses
  if (input.landType === "farm_agricultural") {
    score += 5;
    flags.push("farm");
  }
  if (input.landType === "waterfront") {
    score += 8;
    flags.push("waterfront");
  }
  if (input.landType === "commercial") {
    score += 5;
    flags.push("commercial");
  }

  // FSBO
  if (input.isFsbo) {
    score += 5;
    flags.push("fsbo");
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Priority
  let priority: string;
  if (score >= 80) priority = "urgent";
  else if (score >= 60) priority = "high";
  else if (score >= 40) priority = "medium";
  else priority = "low";

  return { score, flags, priority, photoQualityScore: photoQuality };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Fetching unenriched land listings...\n");

  let query = supabase
    .from("land_listings")
    .select(
      "id, title, source_url, address, photo_count, listing_agent_name, acreage, price, land_type, is_fsbo"
    )
    .or("address.is.null,photo_count.eq.0,listing_agent_name.is.null")
    .order("created_at", { ascending: false });

  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data: listings, error } = await query;

  if (error) {
    console.error("Supabase query error:", error.message);
    process.exit(1);
  }

  if (!listings || listings.length === 0) {
    console.log("No unenriched listings found. All done!");
    return;
  }

  console.log(`Found ${listings.length} unenriched listings.\n`);

  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < listings.length; i += BATCH_SIZE) {
    const batch = listings.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (listing, batchIdx) => {
      const idx = i + batchIdx + 1;
      const total = listings.length;
      const label = listing.title?.slice(0, 50) || listing.source_url;

      const md = await scrapeUrl(listing.source_url);
      if (!md) {
        console.log(`Enriching ${idx}/${total}: ${label}... SKIP (scrape failed)`);
        failed++;
        return;
      }

      // Extract data
      const address = extractAddress(md) || listing.address;
      const price = extractPrice(md) || listing.price;
      const acreage = extractAcreage(md) || listing.acreage;
      const photoCount = countPhotos(md);
      const hasAerial = hasAerialPhotos(md);
      const agent = extractAgent(md);
      const description = extractDescription(md);
      const landType = detectLandType(md) || listing.land_type;
      const isFsbo = detectFsbo(md) || (listing.is_fsbo ?? false);

      // Score
      const scoring = scoreListing({
        photoCount,
        hasAerial,
        acreage,
        price,
        landType,
        isFsbo,
      });

      // Compute price per acre
      const pricePerAcre =
        price && acreage && acreage > 0
          ? Math.round(price / acreage)
          : null;

      console.log(
        `Enriching ${idx}/${total}: ${label}... ${photoCount} photos, ${hasAerial ? "has aerial" : "no aerial"}, score: ${scoring.score} (${scoring.priority})`
      );

      const update: Record<string, any> = {
        address,
        price,
        acreage,
        // price_per_acre is a generated column — skip
        photo_count: photoCount,
        has_aerial_photos: hasAerial,
        listing_agent_name: agent.name || listing.listing_agent_name,
        listing_agent_company: agent.company,
        listing_agent_phone: agent.phone,
        listing_agent_email: agent.email,
        description,
        land_type: landType,
        is_fsbo: isFsbo,
        opportunity_score: scoring.score,
        opportunity_flags: scoring.flags,
        priority: scoring.priority,
        photo_quality_score: scoring.photoQualityScore,
        last_checked_at: new Date().toISOString(),
      };

      if (DRY_RUN) {
        console.log(`  [DRY RUN] Would update ${listing.id}:`, JSON.stringify(update, null, 2));
      } else {
        const { error: updateErr } = await supabase
          .from("land_listings")
          .update(update)
          .eq("id", listing.id);

        if (updateErr) {
          console.error(`  UPDATE FAILED for ${listing.id}: ${updateErr.message}`);
          failed++;
          return;
        }
      }

      enriched++;
    });

    await Promise.all(promises);

    // Delay between batches (skip after last batch)
    if (i + BATCH_SIZE < listings.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(
    `\nDone. Enriched: ${enriched}, Failed/Skipped: ${failed}, Total: ${listings.length}`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
