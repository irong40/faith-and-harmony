// Enrich Drone Leads Edge Function
// Discovers businesses via Serper Places API, finds emails via Hunter.io,
// generates AI pitch emails via OpenAI, and inserts enriched drone_leads.
//
// Auth: Admin only (Bearer token validated against auth.users + user_roles)
// Method: POST only
//
// Endpoints:
//   POST / - Run enrichment job
//
// Body:
//   { "query": "real estate agents Hampton Roads VA", "max_results": 10 }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EnrichRequest {
  query: string;
  max_results?: number;
  region?: string;
}

interface SerperPlace {
  title: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  ratingCount?: number;
  cid?: string;
  category?: string;
}

interface HunterResult {
  email: string;
  score: number;
  type: string;
  first_name?: string;
  last_name?: string;
}

interface LeadRecord {
  company_name: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  website: string | null;
  google_rating: number | null;
  review_count: number | null;
  serper_place_id: string | null;
  portfolio_type: string | null;
  email: string | null;
  hunter_io_score: number | null;
  email_status: string | null;
  ai_email_subject: string | null;
  ai_email_body: string | null;
  status: string;
  priority: string;
}

// --------------------------------------------------
// Serper Places Search
// --------------------------------------------------
async function searchPlaces(
  query: string,
  maxResults: number,
  apiKey: string,
): Promise<SerperPlace[]> {
  const res = await fetch("https://google.serper.dev/places", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num: maxResults }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper places search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.places || []) as SerperPlace[];
}

// --------------------------------------------------
// Hunter.io Domain Search
// --------------------------------------------------
async function findEmail(
  domain: string,
  apiKey: string,
): Promise<HunterResult | null> {
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=1&api_key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.warn(`Hunter.io failed for ${domain}: ${res.status}`);
    return null;
  }

  const data = await res.json();
  const emails = data?.data?.emails || [];
  if (emails.length === 0) return null;

  const best = emails[0];
  return {
    email: best.value,
    score: best.confidence || 0,
    type: best.type || "unknown",
    first_name: best.first_name || undefined,
    last_name: best.last_name || undefined,
  };
}

// --------------------------------------------------
// Extract domain from URL
// --------------------------------------------------
function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// --------------------------------------------------
// Parse city/state from Serper address string
// --------------------------------------------------
function parseAddress(address: string): { city: string; state: string } {
  // Serper addresses look like "123 Main St, Norfolk, VA 23510"
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 2) {
    const city = parts[parts.length - 2] || "";
    const stateZip = parts[parts.length - 1] || "";
    const stateMatch = stateZip.match(/^([A-Z]{2})/);
    return { city, state: stateMatch ? stateMatch[1] : "VA" };
  }
  return { city: "", state: "VA" };
}

// --------------------------------------------------
// Infer portfolio type from category/query
// --------------------------------------------------
function inferPortfolioType(category: string | undefined, query: string): string {
  const text = `${category || ""} ${query}`.toLowerCase();
  if (text.includes("real estate") || text.includes("realtor") || text.includes("realty")) return "real_estate";
  if (text.includes("property manage")) return "property_management";
  if (text.includes("construct")) return "construction";
  if (text.includes("roofing") || text.includes("roof")) return "roofing";
  if (text.includes("insurance")) return "insurance";
  if (text.includes("solar")) return "solar";
  if (text.includes("church") || text.includes("faith") || text.includes("ministry")) return "faith_org";
  return "commercial";
}

// --------------------------------------------------
// Assign priority based on enrichment quality
// --------------------------------------------------
function assignPriority(lead: LeadRecord): string {
  let score = 0;
  if (lead.email) score += 3;
  if (lead.website) score += 1;
  if (lead.phone) score += 1;
  if ((lead.google_rating || 0) >= 4.0) score += 1;
  if ((lead.review_count || 0) >= 10) score += 1;
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

// --------------------------------------------------
// Generate AI pitch email via OpenAI
// --------------------------------------------------
async function generatePitch(
  lead: LeadRecord,
  apiKey: string,
): Promise<{ subject: string; body: string } | null> {
  const prompt = `You are writing a short cold email from Sentinel Aerial Inspections, a drone services company in Hampton Roads, Virginia. The owner is Dr. Adam Pierce, a U.S. Army veteran.

Services offered: aerial photography, property inspections, 3D photogrammetry, construction progress documentation.

Write a personalized cold email to this business:
Company: ${lead.company_name}
Industry: ${lead.portfolio_type || "commercial"}
City: ${lead.city}, ${lead.state}
${lead.website ? `Website: ${lead.website}` : ""}

Rules:
- Keep it under 120 words
- Use active voice
- No dashes, no semicolons, no emojis, no marketing jargon
- Be specific about how drone services help their industry
- End with a clear call to action (brief phone call or reply)
- Sign off as "Adam Pierce" with title "Owner, Sentinel Aerial Inspections"

Return ONLY valid JSON: {"subject": "...", "body": "..."}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!res.ok) {
      console.warn(`OpenAI pitch generation failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Parse JSON from response (handle markdown code blocks)
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("AI pitch parse error:", err);
    return null;
  }
}

// --------------------------------------------------
// Main Handler
// --------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY")!;
  const HUNTER_IO_API_KEY = Deno.env.get("HUNTER_IO_API_KEY")!;
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

  // Validate admin auth
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Authorization required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid authentication" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return new Response(
      JSON.stringify({ error: "Admin access required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body: EnrichRequest = await req.json();
    if (!body.query?.trim()) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const maxResults = Math.min(body.max_results || 10, 20);
    console.log(`Enrichment job starting: "${body.query}" (max ${maxResults})`);

    // Create lead_gen_jobs tracking record
    const { data: job, error: jobError } = await supabase
      .from("lead_gen_jobs")
      .insert({
        job_type: "manual",
        search_config: { query: body.query, max_results: maxResults, region: body.region },
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    const stats = {
      searches_performed: 0,
      raw_results_found: 0,
      duplicates_filtered: 0,
      emails_found: 0,
      ai_drafts_generated: 0,
      leads_created: 0,
      serper_cost: 0,
      hunter_io_cost: 0,
      openai_cost: 0,
    };

    try {
      // Step 1: Serper Places search
      const places = await searchPlaces(body.query, maxResults, SERPER_API_KEY);
      stats.searches_performed = 1;
      stats.raw_results_found = places.length;
      stats.serper_cost = 0.005; // Serper charges per search, not per result
      console.log(`Serper returned ${places.length} places`);

      // Step 2: Dedup against existing leads
      const companyNames = places.map((p) => p.title);
      const { data: existing } = await supabase
        .from("drone_leads")
        .select("company_name, phone")
        .or(companyNames.map((n) => `company_name.ilike.%${n.replace(/'/g, "''")}%`).join(","));

      const existingSet = new Set(
        (existing || []).map((e) => e.company_name.toLowerCase()),
      );

      const newPlaces = places.filter((p) => !existingSet.has(p.title.toLowerCase()));
      stats.duplicates_filtered = places.length - newPlaces.length;
      console.log(`After dedup: ${newPlaces.length} new leads`);

      // Step 3: Enrich each lead
      const leads: LeadRecord[] = [];

      for (const place of newPlaces) {
        const { city, state } = parseAddress(place.address || "");
        const lead: LeadRecord = {
          company_name: place.title,
          address: place.address || "",
          city,
          state,
          phone: place.phone || null,
          website: place.website || null,
          google_rating: place.rating || null,
          review_count: place.ratingCount || null,
          serper_place_id: place.cid || null,
          portfolio_type: inferPortfolioType(place.category, body.query),
          email: null,
          hunter_io_score: null,
          email_status: null,
          ai_email_subject: null,
          ai_email_body: null,
          status: "new",
          priority: "medium",
        };

        // Step 3a: Hunter.io email lookup (if website exists)
        if (place.website) {
          const domain = extractDomain(place.website);
          if (domain) {
            const hunterResult = await findEmail(domain, HUNTER_IO_API_KEY);
            stats.hunter_io_cost += 0.01; // ~$0.01 per search on free tier
            if (hunterResult) {
              lead.email = hunterResult.email;
              lead.hunter_io_score = hunterResult.score;
              lead.email_status = hunterResult.score >= 70 ? "verified" : "unverified";
              stats.emails_found++;
            }
          }
        }

        // Step 3b: AI pitch generation (for leads with email or phone)
        if (lead.email || lead.phone) {
          const pitch = await generatePitch(lead, OPENAI_API_KEY);
          stats.openai_cost += 0.001; // GPT-4o-mini is ~$0.15/1M input tokens
          if (pitch) {
            lead.ai_email_subject = pitch.subject;
            lead.ai_email_body = pitch.body;
            stats.ai_drafts_generated++;
          }
        }

        lead.priority = assignPriority(lead);
        leads.push(lead);
      }

      // Step 4: Insert all leads
      if (leads.length > 0) {
        const { error: insertError } = await supabase
          .from("drone_leads")
          .insert(leads);

        if (insertError) {
          console.error("Lead insert error:", insertError);
          throw insertError;
        }
        stats.leads_created = leads.length;
      }

      // Step 5: Update job record with success
      await supabase
        .from("lead_gen_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          ...stats,
        })
        .eq("id", job.id);

      console.log(`Enrichment complete: ${stats.leads_created} leads created`);

      // Step 6: Notify admin
      await supabase.from("notifications").insert({
        user_email: "info@faithandharmonyllc.com",
        type: "system",
        title: `Lead enrichment complete: ${stats.leads_created} new leads`,
        body: `Query: "${body.query}". Found ${stats.raw_results_found} businesses, ${stats.duplicates_filtered} duplicates filtered, ${stats.emails_found} emails found, ${stats.ai_drafts_generated} pitches drafted.`,
        link: "/admin/leads",
      });

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          ...stats,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (err) {
      // Update job with failure
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabase
        .from("lead_gen_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: message,
          ...stats,
        })
        .eq("id", job.id);

      throw err;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("enrich-drone-leads error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
