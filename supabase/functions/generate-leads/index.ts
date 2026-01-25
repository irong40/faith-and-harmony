import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchConfig {
  cities: string[];
  niches: string[];
  resultsPerSearch: number;
}

interface SerperResult {
  title: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  ratingCount?: number;
  placeId?: string;
}

interface HunterResult {
  email?: string;
  score?: number;
  status?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serperApiKey = Deno.env.get('SERPER_API_KEY');
  const hunterApiKey = Deno.env.get('HUNTER_API_KEY');
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { config, jobType = 'manual' } = await req.json() as { config: SearchConfig; jobType?: string };

    const defaultConfig: SearchConfig = {
      cities: ['Norfolk VA', 'Virginia Beach VA', 'Chesapeake VA', 'Hampton VA', 'Newport News VA'],
      niches: ['property management company', 'real estate agency', 'construction company', 'roofing contractor'],
      resultsPerSearch: 10,
    };

    const searchConfig = { ...defaultConfig, ...config };

    console.log('Starting lead generation with config:', searchConfig);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('lead_gen_jobs')
      .insert({
        job_type: jobType,
        search_config: searchConfig,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create job:', jobError);
      throw new Error('Failed to create job record');
    }

    let searchesPerformed = 0;
    let rawResultsFound = 0;
    let duplicatesFiltered = 0;
    let emailsFound = 0;
    let aiDraftsGenerated = 0;
    let leadsCreated = 0;
    let serperCost = 0;
    let hunterCost = 0;
    let openaiCost = 0;

    const allResults: Array<{
      companyName: string;
      city: string;
      state: string;
      niche: string;
      address?: string;
      phone?: string;
      website?: string;
      rating?: number;
      reviewCount?: number;
      placeId?: string;
    }> = [];

    // Step 1: Search using Serper API
    if (serperApiKey) {
      for (const city of searchConfig.cities) {
        for (const niche of searchConfig.niches) {
          const query = `${niche} in ${city}`;
          console.log(`Searching: ${query}`);

          try {
            const response = await fetch('https://google.serper.dev/places', {
              method: 'POST',
              headers: {
                'X-API-KEY': serperApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                q: query,
                num: searchConfig.resultsPerSearch,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const places = data.places || [];
              searchesPerformed++;
              rawResultsFound += places.length;
              serperCost += 0.001; // Approximate cost per search

              for (const place of places as SerperResult[]) {
                const cityState = city.split(' ');
                const state = cityState.pop() || 'VA';
                const cityName = cityState.join(' ');

                allResults.push({
                  companyName: place.title,
                  city: cityName,
                  state: state,
                  niche: niche,
                  address: place.address,
                  phone: place.phone,
                  website: place.website,
                  rating: place.rating,
                  reviewCount: place.ratingCount,
                  placeId: place.placeId,
                });
              }
            }
          } catch (error) {
            console.error(`Search failed for ${query}:`, error);
          }
        }
      }
    }

    // Step 2: Deduplicate against existing leads
    const { data: existingLeads } = await supabase
      .from('drone_leads')
      .select('company_name, phone, website');

    const existingNames = new Set((existingLeads || []).map(l => l.company_name.toLowerCase()));
    const existingPhones = new Set((existingLeads || []).filter(l => l.phone).map(l => l.phone));
    const existingWebsites = new Set((existingLeads || []).filter(l => l.website).map(l => l.website?.toLowerCase()));

    const uniqueResults = allResults.filter(result => {
      const isDupe = existingNames.has(result.companyName.toLowerCase()) ||
        (result.phone && existingPhones.has(result.phone)) ||
        (result.website && existingWebsites.has(result.website.toLowerCase()));

      if (isDupe) duplicatesFiltered++;
      return !isDupe;
    });

    // Also dedupe within results
    const seenInBatch = new Set<string>();
    const dedupedResults = uniqueResults.filter(result => {
      const key = result.companyName.toLowerCase();
      if (seenInBatch.has(key)) {
        duplicatesFiltered++;
        return false;
      }
      seenInBatch.add(key);
      return true;
    });

    console.log(`Found ${dedupedResults.length} unique leads after deduplication`);

    // Step 3: Enrich with Hunter.io for emails
    const enrichedResults: Array<typeof dedupedResults[0] & { email?: string; hunterScore?: number; emailStatus?: string }> = [];

    for (const result of dedupedResults) {
      let email: string | undefined;
      let hunterScore: number | undefined;
      let emailStatus: string | undefined;

      if (hunterApiKey && result.website) {
        try {
          const domain = new URL(result.website).hostname.replace('www.', '');
          const hunterResponse = await fetch(
            `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${hunterApiKey}`
          );

          if (hunterResponse.ok) {
            const hunterData = await hunterResponse.json();
            const emails = hunterData.data?.emails || [];
            hunterCost += 0.01; // Approximate cost per lookup

            if (emails.length > 0) {
              const bestEmail = emails.sort((a: any, b: any) => (b.confidence || 0) - (a.confidence || 0))[0];
              email = bestEmail.value;
              hunterScore = bestEmail.confidence;
              emailStatus = 'found';
              emailsFound++;
            } else {
              emailStatus = 'not_found';
            }
          }
        } catch (error) {
          console.error(`Hunter lookup failed for ${result.website}:`, error);
          emailStatus = 'error';
        }
      }

      enrichedResults.push({ ...result, email, hunterScore, emailStatus });
    }

    // Step 4: Generate AI email drafts using Lovable AI
    const leadsToInsert: Array<{
      company_name: string;
      email?: string;
      phone?: string;
      website?: string;
      address?: string;
      city?: string;
      state?: string;
      portfolio_type?: string;
      google_rating?: number;
      review_count?: number;
      serper_place_id?: string;
      hunter_io_score?: number;
      email_status?: string;
      ai_email_subject?: string;
      ai_email_body?: string;
      status: string;
      priority: string;
    }> = [];

    for (const result of enrichedResults) {
      let aiSubject: string | undefined;
      let aiBody: string | undefined;

      if (anthropicApiKey && result.email) {
        try {
          const prompt = `Write a brief, professional cold email to ${result.companyName}, a ${result.niche} in ${result.city}, ${result.state}. 
          
The email should:
- Introduce Faith & Harmony's professional drone photography services
- Highlight benefits for their specific industry (property marketing, construction progress, roof inspections, etc.)
- Be concise (under 150 words)
- Include a clear call to action for scheduling a demo flight
- Sound personal, not templated

Return JSON format: {"subject": "...", "body": "..."}`;

          const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1024,
              temperature: 0, // For consistent, deterministic output
              system: 'You are a professional sales email writer. Always respond with valid JSON.',
              messages: [
                { role: 'user', content: prompt },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const content = aiData.content?.[0]?.text || '';
            openaiCost += 0.003; // Claude 3.5 Sonnet cost estimate

            try {
              // Extract JSON from response
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                aiSubject = parsed.subject;
                aiBody = parsed.body;
                aiDraftsGenerated++;
              }
            } catch (parseError) {
              console.error('Failed to parse AI response:', parseError);
            }
          }
        } catch (error) {
          console.error(`AI draft failed for ${result.companyName}:`, error);
        }
      }

      leadsToInsert.push({
        company_name: result.companyName,
        email: result.email,
        phone: result.phone,
        website: result.website,
        address: result.address,
        city: result.city,
        state: result.state,
        portfolio_type: result.niche,
        google_rating: result.rating,
        review_count: result.reviewCount,
        serper_place_id: result.placeId,
        hunter_io_score: result.hunterScore,
        email_status: result.emailStatus,
        ai_email_subject: aiSubject,
        ai_email_body: aiBody,
        status: 'new',
        priority: result.email ? 'high' : 'medium',
      });
    }

    // Step 5: Insert leads into database
    if (leadsToInsert.length > 0) {
      const { data: insertedLeads, error: insertError } = await supabase
        .from('drone_leads')
        .insert(leadsToInsert)
        .select();

      if (insertError) {
        console.error('Failed to insert leads:', insertError);
      } else {
        leadsCreated = insertedLeads?.length || 0;
      }
    }

    // Step 6: Update job record with results
    await supabase
      .from('lead_gen_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        searches_performed: searchesPerformed,
        raw_results_found: rawResultsFound,
        duplicates_filtered: duplicatesFiltered,
        emails_found: emailsFound,
        ai_drafts_generated: aiDraftsGenerated,
        leads_created: leadsCreated,
        serper_cost: serperCost,
        hunter_io_cost: hunterCost,
        openai_cost: openaiCost,
      })
      .eq('id', job.id);

    console.log('Lead generation completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        stats: {
          searchesPerformed,
          rawResultsFound,
          duplicatesFiltered,
          emailsFound,
          aiDraftsGenerated,
          leadsCreated,
          estimatedCost: serperCost + hunterCost + openaiCost,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Lead generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
