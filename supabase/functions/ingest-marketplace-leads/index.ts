// Ingest Marketplace Leads Edge Function
// Receives batch job data from DroneSniper agent
// Deduplicates by source+external_job_id, inserts/updates leads
//
// Auth: x-webhook-secret header (shared secret with agent)
// Method: POST only

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MarketplaceLead {
  external_job_id: string;
  source_slug: string;
  title: string;
  url?: string;
  location_text?: string;
  latitude?: number;
  longitude?: number;
  distance_miles?: number;
  job_type?: string;
  category_raw?: string;
  budget?: number;
  description?: string;
  client_name?: string;
  expiry?: string;
  job_date?: string;
  score?: number;
  confidence?: string;
  suggested_bid?: number;
  evaluation_breakdown?: Record<string, unknown>;
  competitor_bids?: number[];
  competitor_count?: number;
  competitor_median?: number;
  independent_rate?: number;
  platform_net?: number;
  commission_paid?: number;
  delta?: number;
  delta_percent?: number;
  effective_hourly?: number;
  typical_hours?: number;
  bid_status?: string;
  agent_action?: string;
  raw_data?: Record<string, unknown>;
}

interface IngestPayload {
  source_slug: string;
  scan_cycle_id?: string;
  leads: MarketplaceLead[];
  stats?: {
    jobs_scraped?: number;
    auto_declined?: number;
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Auth
  const secret = req.headers.get('x-webhook-secret');
  const envSecret = Deno.env.get('MARKETPLACE_WEBHOOK_SECRET') || '';
  if (!secret || secret !== envSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await req.json() as IngestPayload;

    if (!payload.source_slug || !Array.isArray(payload.leads)) {
      return json({ error: 'Missing source_slug or leads array' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Create scan run record
    const scanRunId = payload.scan_cycle_id || crypto.randomUUID();
    const { data: scanRun, error: scanError } = await supabase
      .from('marketplace_scan_runs')
      .insert({
        id: scanRunId,
        source_slug: payload.source_slug,
        scan_type: 'scheduled',
        status: 'running',
        started_at: new Date().toISOString(),
        jobs_scraped: payload.stats?.jobs_scraped || payload.leads.length,
      })
      .select('id')
      .single();

    if (scanError) {
      console.error('Scan run insert failed:', scanError);
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let autoDeclined = payload.stats?.auto_declined || 0;

    for (const lead of payload.leads) {
      if (!lead.external_job_id) {
        skipped++;
        continue;
      }

      // Check for existing lead by dedup_key
      const dedupKey = `${payload.source_slug}:${lead.external_job_id}`;
      const { data: existing } = await supabase
        .from('marketplace_leads')
        .select('id, bid_status')
        .eq('source_slug', payload.source_slug)
        .eq('external_job_id', lead.external_job_id)
        .maybeSingle();

      const row = {
        source_slug: payload.source_slug,
        external_job_id: lead.external_job_id,
        title: lead.title,
        url: lead.url || null,
        location_text: lead.location_text || null,
        latitude: lead.latitude || null,
        longitude: lead.longitude || null,
        distance_miles: lead.distance_miles || null,
        job_type: lead.job_type || null,
        category_raw: lead.category_raw || null,
        budget: lead.budget || null,
        description: lead.description || null,
        client_name: lead.client_name || null,
        expiry: lead.expiry || null,
        job_date: lead.job_date || null,
        score: lead.score ?? null,
        confidence: lead.confidence || null,
        suggested_bid: lead.suggested_bid || null,
        evaluation_breakdown: lead.evaluation_breakdown || {},
        competitor_bids: lead.competitor_bids || [],
        competitor_count: lead.competitor_count || 0,
        competitor_median: lead.competitor_median || null,
        independent_rate: lead.independent_rate || null,
        platform_net: lead.platform_net || null,
        commission_paid: lead.commission_paid || null,
        delta: lead.delta || null,
        delta_percent: lead.delta_percent || null,
        effective_hourly: lead.effective_hourly || null,
        typical_hours: lead.typical_hours || null,
        bid_status: lead.bid_status || 'new',
        agent_action: lead.agent_action || null,
        scan_cycle_id: scanRunId,
        raw_data: lead.raw_data || {},
      };

      if (existing) {
        // Don't overwrite user decisions (approved, declined, bid_placed, won, etc.)
        const protectedStatuses = ['approved', 'declined', 'bid_placed', 'won', 'lost', 'mission_created'];
        if (protectedStatuses.includes(existing.bid_status)) {
          skipped++;
          continue;
        }

        // Update with fresh data
        const { error } = await supabase
          .from('marketplace_leads')
          .update({
            ...row,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error(`Update failed for ${dedupKey}:`, error.message);
          skipped++;
        } else {
          updated++;
        }
      } else {
        // Insert new lead
        const { error } = await supabase
          .from('marketplace_leads')
          .insert(row);

        if (error) {
          // Handle unique constraint violation (race condition)
          if (error.code === '23505') {
            skipped++;
          } else {
            console.error(`Insert failed for ${dedupKey}:`, error.message);
            skipped++;
          }
        } else {
          inserted++;
        }
      }
    }

    // Update scan run with results
    if (scanRun) {
      await supabase
        .from('marketplace_scan_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          new_leads: inserted,
          updated_leads: updated,
          duplicates_skipped: skipped,
          auto_declined: autoDeclined,
        })
        .eq('id', scanRunId);
    }

    console.log(`Ingest: source=${payload.source_slug} inserted=${inserted} updated=${updated} skipped=${skipped}`);

    return json({
      success: true,
      scan_run_id: scanRunId,
      inserted,
      updated,
      skipped,
      total: payload.leads.length,
    }, 201);

  } catch (error) {
    console.error('Ingest error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500,
    );
  }
}

serve(handleRequest);
