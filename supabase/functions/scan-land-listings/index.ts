import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================
// Types
// ============================================

interface ScanConfig {
  region_ids?: string[];
  source_slugs?: string[];
  max_results_per_source?: number;
  manual?: boolean;
}

interface RawListing {
  title: string;
  url: string;
  description?: string;
  price?: number;
  acreage?: number;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  land_type?: string;
  photo_count?: number;
  photo_urls?: string[];
  listing_agent_name?: string;
  listing_agent_phone?: string;
  listing_agent_email?: string;
  listing_agent_company?: string;
  is_fsbo?: boolean;
  listing_date?: string;
  source_slug: string;
  external_id?: string;
  raw_data?: Record<string, unknown>;
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body: ScanConfig = await req.json().catch(() => ({}));
    const config: ScanConfig = {
      max_results_per_source: 20,
      ...body,
    };

    console.log("Starting land listing scan:", config);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("land_monitor_jobs")
      .insert({
        job_type: body.manual ? "manual" : "scheduled",
        source_ids: null,
        region_ids: config.region_ids || null,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    try {
      // Step 1: Load active regions
      const regions = await loadRegions(supabase, config.region_ids);
      console.log(`Loaded ${regions.length} regions`);

      // Step 2: Load active sources
      const sources = await loadSources(supabase, config.source_slugs);
      console.log(`Loaded ${sources.length} sources`);

      // Step 3: Search via Serper (Google search)
      const rawListings = await searchForListings(regions, config.max_results_per_source!, SERPER_API_KEY);
      console.log(`Found ${rawListings.length} raw listings`);

      // Step 4: Craigslist RSS
      const craigslistListings = await scanCraigslistRSS(regions);
      console.log(`Found ${craigslistListings.length} Craigslist listings`);

      const allListings = [...rawListings, ...craigslistListings];

      // Step 5: Deduplicate
      const newListings = await deduplicateListings(supabase, allListings);
      console.log(`After dedup: ${newListings.length} new listings`);

      // Step 5.5: Mark stale listings as expired (not seen in 14+ days)
      const staleCount = await markStaleListings(supabase);
      console.log(`Marked ${staleCount} stale listings as expired`);

      // Step 6: Score opportunities
      const scoredListings = scoreListings(newListings);
      console.log(`Scored ${scoredListings.length} listings`);

      // Step 7: Generate AI pitches for high-opportunity listings
      const highOpportunity = scoredListings.filter((l) => l.opportunity_score >= 60);
      const withPitches = await generatePitches(highOpportunity, OPENAI_API_KEY);
      console.log(`Generated pitches for ${withPitches.length} high-opportunity listings`);

      // Step 8: Save all listings
      const allToSave = [
        ...scoredListings.filter((l) => l.opportunity_score < 60),
        ...withPitches,
      ];
      const savedCount = await saveListings(supabase, allToSave);
      console.log(`Saved ${savedCount} listings`);

      // Update job
      await supabase
        .from("land_monitor_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          listings_scanned: allListings.length,
          new_listings_found: newListings.length,
          high_opportunity_count: highOpportunity.length,
          duplicates_skipped: allListings.length - newListings.length,
          api_cost: calculateCost(rawListings.length),
        })
        .eq("id", job.id);

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          stats: {
            sources_scanned: sources.length + 1,
            regions_covered: regions.length,
            raw_found: allListings.length,
            new_listings: newListings.length,
            high_opportunity: highOpportunity.length,
            pitches_generated: withPitches.length,
            saved: savedCount,
          },
          cost: calculateCost(rawListings.length),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      await supabase
        .from("land_monitor_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: (error as Error).message,
          error_details: { stack: (error as Error).stack },
        })
        .eq("id", job.id);
      throw error;
    }
  } catch (error) {
    console.error("Error in scan-land-listings:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ============================================
// Step 1: Load Regions
// ============================================

async function loadRegions(supabase: ReturnType<typeof createClient>, regionIds?: string[]) {
  let query = supabase.from("land_monitor_regions").select("*").eq("is_active", true);
  if (regionIds?.length) {
    query = query.in("id", regionIds);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================
// Step 2: Load Sources
// ============================================

async function loadSources(supabase: ReturnType<typeof createClient>, sourceSlugs?: string[]) {
  let query = supabase.from("land_listing_sources").select("*").eq("is_active", true);
  if (sourceSlugs?.length) {
    query = query.in("slug", sourceSlugs);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================
// Step 3: Search via Serper
// ============================================

async function searchForListings(
  regions: Array<{ name: string; cities: string[]; states: string[] }>,
  maxResults: number,
  serperKey: string
): Promise<RawListing[]> {
  const allListings: RawListing[] = [];

  // Use site-specific searches to get individual listing pages, not directory pages
  const siteQueries = [
    { site: "zillow.com/homedetails", label: "zillow" },
    { site: "landwatch.com", label: "landwatch" },
    { site: "land.com", label: "land.com" },
    { site: "landandfarm.com", label: "landandfarm" },
    { site: "redfin.com/VA", label: "redfin-va" },
    { site: "redfin.com/NC", label: "redfin-nc" },
  ];

  const landTerms = [
    "land for sale acres",
    "vacant lot for sale",
    "farm acreage for sale",
    "waterfront land for sale",
  ];

  for (const region of regions) {
    for (const city of region.cities) {
      const state = region.states[0];
      // Pick 2 random site targets and 1 random land term per city
      const shuffledSites = siteQueries.sort(() => Math.random() - 0.5).slice(0, 2);
      const landTerm = landTerms[Math.floor(Math.random() * landTerms.length)];

      for (const sq of shuffledSites) {
        try {
          // Search for individual listings on specific sites
          const query = `site:${sq.site} ${landTerm} ${city} ${state}`;

          const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": serperKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: query,
              num: Math.min(maxResults, 10),
            }),
          });

          if (!response.ok) {
            console.error(`Serper error for "${query}":`, response.statusText);
            continue;
          }

          const data = await response.json();
          const results = data.organic || [];

          for (const result of results) {
            // Skip directory/index/search result pages
            if (isDirectoryPage(result.title, result.link)) continue;
            if (isListingSite(result.link)) {
              const listing = parseSerperResult(result, city, state);
              if (listing) allListings.push(listing);
            }
          }

          await new Promise((r) => setTimeout(r, 1000));
        } catch (error) {
          console.error("Search error:", error);
        }
      }
    }
  }

  return allListings;
}

function extractAddressFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // Zillow: /homedetails/123-Main-St-City-ST-12345/zpid_
    const zillowMatch = path.match(/\/homedetails\/([^/]+)\//);
    if (zillowMatch) {
      const slug = zillowMatch[1];
      // Remove trailing zpid number and state+zip suffix, then convert dashes to spaces
      const cleaned = slug
        .replace(/_zpid$/, "")
        .replace(/-\d{5,}$/, "") // trailing zip
        .replace(/-([A-Z]{2})$/, "") // trailing state abbreviation
        .replace(/-/g, " ");
      if (/\d/.test(cleaned)) return cleaned; // must contain a house number
    }

    // Redfin: /VA/Chesapeake/123-Main-St-12345/home/...
    const redfinMatch = path.match(/\/[A-Z]{2}\/[^/]+\/([^/]+)\//);
    if (redfinMatch && url.includes("redfin.com")) {
      const slug = redfinMatch[1];
      const cleaned = slug
        .replace(/-\d{5,}$/, "") // trailing zip
        .replace(/-/g, " ");
      if (/\d/.test(cleaned)) return cleaned;
    }

    // LandWatch: /county/city/property-name paths often contain address-like segments
    if (url.includes("landwatch.com")) {
      const segments = path.split("/").filter(Boolean);
      // Look for a segment that starts with a number (likely an address)
      for (const seg of segments) {
        if (/^\d+-.+/.test(seg)) {
          return seg.replace(/-/g, " ");
        }
      }
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function isListingSite(url: string): boolean {
  const listingSites = [
    "landwatch.com", "land.com", "landsofamerica.com", "landandfarm.com",
    "realtor.com", "redfin.com", "loopnet.com", "crexi.com",
    "zillow.com", "trulia.com", "homes.com", "landflip.com",
    "landcentury.com", "landpin.com", "unitedcountry.com",
    "farmflip.com", "ranchflip.com",
  ];
  return listingSites.some((site) => url.includes(site));
}

function isDirectoryPage(title: string, url: string): boolean {
  const lower = title.toLowerCase();
  // Directory/search pages have these patterns
  const directoryPatterns = [
    /\d+\s*listings/i,           // "60 Listings"
    /\d+\s*properties/i,         // "97 Properties"
    /\d+\s*homes\s*(for|&)/i,    // "256 Homes for Sale"
    /land\s*(&|and)\s*lots\s*for\s*sale\s*$/i,  // generic "Land & Lots For Sale"
    /land\s*for\s*sale\s*-?\s*(landwatch|zillow|redfin|realtor|homes\.com|trulia)/i,
    /for\s*sale\s*-\s*\d+/i,     // "For Sale - 60"
    /real\s*estate\s*(for\s*sale|properties)/i,  // "Real Estate for Sale"
    /commercial\s*(real\s*estate|properties)\s*for/i,
    /waterfront\s*(homes|properties)\s*for\s*sale\s*(in|&|\||-)/i,
    /farmhouses\s*for\s*sale\s*-/i,
    /farms?\s*(for\s*sale|and\s*ranches)\s*(in|-|\|)/i,
    /lot\/land\s*for\s*sale/i,
  ];

  // URL patterns that indicate directory pages
  const urlDirectoryPatterns = [
    /\/land\/?$/,                 // ends with /land/
    /\/land-for-sale\/?$/,
    /\/type-land\/?$/,
    /search\//,                   // search pages
    /filter/,
    /\/city\//,
  ];

  if (directoryPatterns.some((p) => p.test(lower))) return true;
  if (urlDirectoryPatterns.some((p) => p.test(url))) return true;

  return false;
}

// deno-lint-ignore no-explicit-any
function parseSerperResult(result: any, city: string, state: string): RawListing | null {
  const title = result.title || "";
  const snippet = result.snippet || "";
  const url = result.link || "";
  const combined = title + " " + snippet;

  // --- Better price extraction ---
  // Find all dollar amounts in the combined text
  const priceRegex = /\$[\d,]+(?:\.\d{2})?/g;
  let price: number | undefined;
  let priceMatchResult;
  while ((priceMatchResult = priceRegex.exec(combined)) !== null) {
    const candidate = parseFloat(priceMatchResult[0].replace(/[$,]/g, ""));
    const idx = priceMatchResult.index;
    // Get surrounding context (40 chars each side) to check what this price refers to
    const surroundingText = combined.substring(Math.max(0, idx - 40), Math.min(combined.length, idx + priceMatchResult[0].length + 40)).toLowerCase();
    // Skip prices that appear near count/directory words (these are result counts, not prices)
    const isCountContext = /(?:listings?|results?|homes\s+for|properties\s+for|matches)/.test(surroundingText);
    // Accept prices near land/sale keywords
    const isLandContext = /(?:acres?|lot|land|sale|price|asking|\bper\b)/.test(surroundingText);
    if (isCountContext && !isLandContext) continue;
    // Use the first valid price found
    price = candidate;
    break;
  }

  const acreageMatch = combined.match(/([\d,.]+)\s*(?:acres?|ac\b)/i);
  const acreage = acreageMatch ? parseFloat(acreageMatch[1].replace(/,/g, "")) : undefined;

  // Try to extract a street address from the title or snippet
  // Common patterns: "123 Main St, City, ST" or "123 Main St City ST 12345"
  const addressMatch = combined.match(
    /(\d+[A-Z]?\s+(?:[A-Z][a-z]+\.?\s*){1,4}(?:St|Rd|Ave|Blvd|Dr|Ln|Ct|Way|Trl|Pkwy|Hwy|Loop|Cir|Run|Pl)\b[^,]*)/i
  );
  let address = addressMatch ? addressMatch[1].trim() : undefined;

  // Fallback: extract address from URL if regex didn't find one
  if (!address) {
    address = extractAddressFromUrl(url);
  }

  // Try to extract agent name from snippet
  // Patterns: "Listed by John Smith" or "Agent: John Smith" or "Broker: RE/MAX"
  const agentMatch = snippet.match(/(?:listed\s*by|agent|broker|courtesy\s*of)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/i);
  let agentName = agentMatch ? agentMatch[1].trim() : undefined;

  const companyMatch = snippet.match(/(?:courtesy\s*of|brokered\s*by|office|brokerage)\s*:?\s*([A-Z][^,.\n]{3,40})/i);
  let agentCompany = companyMatch ? companyMatch[1].trim() : undefined;

  // Extract agent info from Serper sitelinks if available
  if (result.sitelinks && Array.isArray(result.sitelinks)) {
    for (const sitelink of result.sitelinks) {
      const slTitle = (sitelink.title || "").toLowerCase();
      const slSnippet = sitelink.snippet || "";
      // Look for agent/broker sitelinks
      if (/agent|broker|contact|team|realtor/i.test(slTitle)) {
        if (!agentName) {
          const slAgentMatch = slSnippet.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/);
          if (slAgentMatch) agentName = slAgentMatch[1].trim();
        }
        if (!agentCompany) {
          const slCompanyMatch = slSnippet.match(/(?:with|at|of|from)\s+([A-Z][^,.\n]{3,40})/i);
          if (slCompanyMatch) agentCompany = slCompanyMatch[1].trim();
        }
      }
    }
  }

  // Extract photo count if mentioned — handles "12 Photos", "View 24 photos", "12 photos · 2 baths"
  const photoMatch = snippet.match(/(?:view\s+)?(\d+)\s*(?:photos?|images?|pics?)\s*(?:[·|,·\-]|$)/i)
    || snippet.match(/(\d+)\s*(?:photos?|images?|pics?)/i);
  const photoCount = photoMatch ? parseInt(photoMatch[1]) : 0;

  const landType = classifyLandType(combined);

  // Extract listing date from Serper result.date if available
  const listingDate = result.date || undefined;

  // Use address as title if we found one, otherwise use the original title
  const displayTitle = address || title.substring(0, 200);

  return {
    title: displayTitle,
    url,
    description: snippet,
    price,
    acreage,
    address,
    city,
    state,
    land_type: landType,
    photo_count: photoCount,
    listing_agent_name: agentName,
    listing_agent_company: agentCompany,
    listing_date: listingDate,
    source_slug: "serper-search",
    external_id: url,
    raw_data: result,
  };
}

// ============================================
// Step 4: Craigslist RSS
// ============================================

async function scanCraigslistRSS(
  regions: Array<{ name: string; cities: string[]; states: string[] }>
): Promise<RawListing[]> {
  const listings: RawListing[] = [];

  const cityToSubdomain: Record<string, string> = {
    Norfolk: "norfolk",
    "Virginia Beach": "norfolk",
    Chesapeake: "norfolk",
    Suffolk: "norfolk",
    Portsmouth: "norfolk",
    Hampton: "norfolk",
    "Newport News": "norfolk",
    Richmond: "richmond",
    "Elizabeth City": "outerbanks",
    "Kitty Hawk": "outerbanks",
    "Kill Devil Hills": "outerbanks",
    "Nags Head": "outerbanks",
  };

  const subdomains = new Set<string>();
  for (const region of regions) {
    for (const city of region.cities) {
      const subdomain = cityToSubdomain[city];
      if (subdomain) subdomains.add(subdomain);
    }
  }

  for (const subdomain of subdomains) {
    try {
      const rssUrl = `https://${subdomain}.craigslist.org/search/lnd?format=rss`;
      const response = await fetch(rssUrl);

      if (!response.ok) {
        console.error(`Craigslist RSS error for ${subdomain}:`, response.statusText);
        continue;
      }

      const xmlText = await response.text();
      const items = parseRSSItems(xmlText);

      for (const item of items) {
        listings.push({
          title: item.title,
          url: item.link,
          description: item.description,
          price: extractPrice(item.title + " " + item.description),
          acreage: extractAcreage(item.title + " " + item.description),
          city: extractCityFromCL(item.title, subdomain),
          state: subdomain === "outerbanks" ? "NC" : "VA",
          land_type: classifyLandType(item.title + " " + item.description),
          photo_count: countImagesInHTML(item.description),
          source_slug: `craigslist-${subdomain}`,
          external_id: item.link,
          listing_date: item.pubDate,
          is_fsbo: true,
          raw_data: item as unknown as Record<string, unknown>,
        });
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      console.error(`Craigslist scan error for ${subdomain}:`, error);
    }
  }

  return listings;
}

// ============================================
// Step 5: Deduplicate
// ============================================

async function deduplicateListings(
  supabase: ReturnType<typeof createClient>,
  listings: RawListing[]
): Promise<RawListing[]> {
  const seen = new Set<string>();
  const unique: RawListing[] = [];

  for (const listing of listings) {
    const dedupKey = listing.external_id || `${listing.title}_${listing.city}_${listing.state}`;

    if (seen.has(dedupKey)) continue;

    const { data: existing } = await supabase
      .from("land_listings")
      .select("id")
      .eq("dedup_key", dedupKey)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("land_listings")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("dedup_key", dedupKey);
      continue;
    }

    seen.add(dedupKey);
    unique.push(listing);
  }

  return unique;
}

// ============================================
// Step 5.5: Mark Stale Listings
// ============================================

async function markStaleListings(supabase: ReturnType<typeof createClient>): Promise<number> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const cutoff = fourteenDaysAgo.toISOString();

  const { data, error } = await supabase
    .from("land_listings")
    .update({ status: "expired" })
    .lt("last_checked_at", cutoff)
    .neq("status", "expired")
    .select("id");

  if (error) {
    console.error("Error marking stale listings:", error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================
// Step 6: Score Listings
// ============================================

// deno-lint-ignore no-explicit-any
function scoreListings(listings: RawListing[]): any[] {
  return listings.map((listing) => {
    let score = 0;
    const flags: string[] = [];

    if (!listing.photo_count || listing.photo_count === 0) {
      score += 35;
      flags.push("no_photos");
    } else if (listing.photo_count < 3) {
      score += 25;
      flags.push("few_photos");
    } else if (listing.photo_count < 6) {
      score += 10;
    }

    score += 15;
    flags.push("no_aerial");

    if (listing.acreage && listing.acreage >= 50) {
      score += 20;
      flags.push("large_parcel");
    } else if (listing.acreage && listing.acreage >= 10) {
      score += 15;
      flags.push("medium_parcel");
    } else if (listing.acreage && listing.acreage >= 2) {
      score += 8;
    }

    if (listing.price && listing.price >= 500000) {
      score += 15;
      flags.push("high_value");
    } else if (listing.price && listing.price >= 100000) {
      score += 10;
      flags.push("mid_value");
    } else if (listing.price && listing.price >= 25000) {
      score += 5;
    }

    if (listing.land_type === "farm_agricultural") {
      score += 5;
      flags.push("farm");
    } else if (listing.land_type === "waterfront") {
      score += 8;
      flags.push("waterfront");
    } else if (listing.land_type === "commercial") {
      score += 5;
    }

    if (listing.is_fsbo) {
      score += 5;
      flags.push("fsbo");
    }

    const finalScore = Math.min(score, 100);
    const photoQuality = listing.photo_count ? Math.min(listing.photo_count * 12, 100) : 0;

    let priority = "low";
    if (finalScore >= 80) priority = "urgent";
    else if (finalScore >= 60) priority = "high";
    else if (finalScore >= 40) priority = "medium";

    return {
      external_id: listing.external_id,
      source_url: listing.url,
      dedup_key: listing.external_id || `${listing.title}_${listing.city}_${listing.state}`,
      title: listing.title,
      description: listing.description,
      address: listing.address,
      city: listing.city,
      county: listing.county,
      state: listing.state || "VA",
      zip_code: listing.zip_code,
      latitude: listing.latitude,
      longitude: listing.longitude,
      land_type: listing.land_type || "other",
      acreage: listing.acreage,
      price: listing.price,
      photo_count: listing.photo_count || 0,
      has_aerial_photos: false,
      photo_quality_score: photoQuality,
      photo_urls: listing.photo_urls,
      listing_agent_name: listing.listing_agent_name,
      listing_agent_phone: listing.listing_agent_phone,
      listing_agent_email: listing.listing_agent_email,
      listing_agent_company: listing.listing_agent_company,
      is_fsbo: listing.is_fsbo || false,
      opportunity_score: finalScore,
      opportunity_flags: flags,
      priority,
      listing_date: listing.listing_date,
      raw_data: listing.raw_data,
      source_slug: listing.source_slug,
    };
  });
}

// ============================================
// Step 7: Generate AI Pitches
// ============================================

// deno-lint-ignore no-explicit-any
async function generatePitches(listings: any[], openaiKey: string): Promise<any[]> {
  if (listings.length === 0) return [];

  const batchSize = 10;
  const batches = [];
  for (let i = 0; i < listings.length; i += batchSize) {
    batches.push(listings.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    try {
      const prompt = buildPitchPrompt(batch);

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a B2B sales copywriter for drone aerial photography/mapping services.
You write concise pitches to real estate agents and landowners who have land listed for sale
that could benefit from professional aerial photography and drone mapping. Output valid JSON only.`,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        console.error("OpenAI error:", response.statusText);
        continue;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "[]";

      let pitches = [];
      try {
        const clean = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        pitches = JSON.parse(clean);
      } catch {
        console.error("Failed to parse AI pitches");
        continue;
      }

      // deno-lint-ignore no-explicit-any
      batch.forEach((listing: any, i: number) => {
        const pitch = pitches[i] || {};
        listing.ai_pitch_subject = pitch.subject || `Aerial photos for your ${listing.city} listing`;
        listing.ai_pitch_body = pitch.body || null;
      });

      await new Promise((r) => setTimeout(r, 2000));
    } catch (error) {
      console.error("Pitch generation error:", error);
    }
  }

  return listings;
}

// deno-lint-ignore no-explicit-any
function buildPitchPrompt(batch: any[]): string {
  return `Generate short pitch emails for these ${batch.length} land listings that need better aerial photography.
Each pitch should be 3 sentences max:
1. Hook: Note the specific listing and how aerial photos would help it sell faster
2. Value: Explain what drone mapping/aerial photography reveals (boundaries, terrain, access roads, water features, etc.)
3. CTA: Offer a quick call or a free sample aerial shot

Keep each under 60 words. Make it specific to the land type and size.

Listings:
${batch
    // deno-lint-ignore no-explicit-any
    .map(
      (l: any, i: number) => `
${i + 1}. "${l.title}"
   Location: ${l.city}, ${l.state}
   Type: ${l.land_type || "land"}
   Acreage: ${l.acreage || "unknown"}
   Price: ${l.price ? "$" + l.price.toLocaleString() : "unknown"}
   Current photos: ${l.photo_count || 0}
   Flags: ${(l.opportunity_flags || []).join(", ")}
`
    )
    .join("")}

Output JSON array:
[{"subject": "...", "body": "Hi,\\n\\n...\\n\\nBest regards,\\nAdam Pierce\\nFaith & Harmony LLC"}]`;
}

// ============================================
// Step 8: Save to Database
// ============================================

// deno-lint-ignore no-explicit-any
async function saveListings(supabase: ReturnType<typeof createClient>, listings: any[]): Promise<number> {
  if (listings.length === 0) return 0;

  const { data: sources } = await supabase
    .from("land_listing_sources")
    .select("id, slug");

  const sourceMap = new Map((sources || []).map((s: { id: string; slug: string }) => [s.slug, s.id]));

  // deno-lint-ignore no-explicit-any
  const toInsert = listings.map((l: any) => {
    const record = {
      ...l,
      source_id: sourceMap.get(l.source_slug) || null,
      raw_data: l.raw_data ? JSON.stringify(l.raw_data) : null,
    };
    delete record.source_slug;
    return record;
  });

  const { data, error } = await supabase.from("land_listings").insert(toInsert).select();

  if (error) {
    console.error("Save error:", error);
    let saved = 0;
    for (const listing of toInsert) {
      const { error: singleError } = await supabase.from("land_listings").insert(listing);
      if (!singleError) saved++;
      else console.error(`Failed to save "${listing.title}":`, singleError.message);
    }
    return saved;
  }

  return data?.length || 0;
}

// ============================================
// Helper Functions
// ============================================

function classifyLandType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("waterfront") || lower.includes("lakefront") || lower.includes("riverfront")) return "waterfront";
  if (lower.includes("farm") || lower.includes("agricultural") || lower.includes("crop")) return "farm_agricultural";
  if (lower.includes("commercial") || lower.includes("industrial") || lower.includes("zoned commercial")) return "commercial";
  if (lower.includes("timber") || lower.includes("wooded")) return "timber";
  if (lower.includes("recreational") || lower.includes("hunting")) return "recreational";
  if (lower.includes("residential lot") || lower.includes("building lot") || lower.includes("home site")) return "residential_lot";
  if (lower.includes("vacant lot") || lower.includes("vacant land")) return "vacant_lot";
  if (lower.includes("mixed use") || lower.includes("mixed-use")) return "mixed_use";
  return "other";
}

function extractPrice(text: string): number | undefined {
  const match = text.match(/\$[\d,]+(?:\.\d{2})?/);
  if (match) return parseFloat(match[0].replace(/[$,]/g, ""));
  return undefined;
}

function extractAcreage(text: string): number | undefined {
  const match = text.match(/([\d,.]+)\s*(?:acres?|ac\b)/i);
  if (match) return parseFloat(match[1].replace(/,/g, ""));
  return undefined;
}

function extractCityFromCL(title: string, subdomain: string): string {
  const match = title.match(/\(([^)]+)\)/);
  if (match) return match[1].trim();
  const subdomainToCity: Record<string, string> = {
    norfolk: "Norfolk Area",
    richmond: "Richmond Area",
    outerbanks: "Outer Banks Area",
  };
  return subdomainToCity[subdomain] || "Unknown";
}

function countImagesInHTML(html: string): number {
  if (!html) return 0;
  const imgMatches = html.match(/<img/gi);
  return imgMatches ? imgMatches.length : 0;
}

function parseRSSItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate?: string;
}> {
  const items: Array<{ title: string; link: string; description: string; pubDate?: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractXmlTag(itemXml, "title");
    const link = extractXmlTag(itemXml, "link");
    const description = extractXmlTag(itemXml, "description");
    const pubDate = extractXmlTag(itemXml, "dc:date") || extractXmlTag(itemXml, "pubDate");

    if (title && link) {
      items.push({
        title: decodeHTMLEntities(title),
        link,
        description: decodeHTMLEntities(description || ""),
        pubDate,
      });
    }
  }

  return items;
}

function extractXmlTag(xml: string, tag: string): string | null {
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, "");
}

function calculateCost(serperSearches: number): number {
  return serperSearches * 0.005 + 0.001;
}
