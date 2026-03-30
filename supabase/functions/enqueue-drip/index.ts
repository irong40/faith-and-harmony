// Enqueue Drip Edge Function
//
// Creates scheduled email rows for a drip sequence.
// Called by:
//   - Admin UI "Start Outreach" button (outreach_drip)
//   - DB trigger on drone_jobs.status = 'delivered' (post_delivery)
//   - intake-lead edge function after Vapi call (vapi_followup)
//
// Auth: service role or x-webhook-secret header
// Method: POST only

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export type SequenceType = 'outreach_drip' | 'post_delivery' | 'vapi_followup';

export interface EnqueueRequest {
  lead_id: string;
  sequence_type: SequenceType;
  context?: Record<string, unknown>;
}

// Schedule offsets in days for each sequence type
export const SEQUENCE_SCHEDULES: Record<SequenceType, number[]> = {
  outreach_drip: [0, 3, 9],     // Day 1, Day 4, Day 10 (0-indexed offsets)
  post_delivery: [0, 6, 13, 29], // Day 1, Day 7, Day 14, Day 30
  vapi_followup: [0],            // Immediate (within next cron cycle)
};

/** Validate the enqueue request body. Returns error message or null if valid. */
export function validateEnqueueRequest(
  body: Partial<EnqueueRequest>,
): string | null {
  if (!body.lead_id || !body.sequence_type) {
    return 'lead_id and sequence_type are required';
  }
  if (!SEQUENCE_SCHEDULES[body.sequence_type]) {
    return `Invalid sequence_type: ${body.sequence_type}`;
  }
  return null;
}

/** Build scheduled email rows from lead info and sequence config. */
export function buildScheduleRows(
  lead: { email: string; company_name: string | null },
  leadId: string,
  sequenceType: SequenceType,
  context: Record<string, unknown>,
  now: Date,
): Array<{
  lead_id: string;
  recipient_email: string;
  recipient_name: string | null;
  sequence_type: SequenceType;
  sequence_step: number;
  scheduled_for: string;
  status: 'pending';
  context: Record<string, unknown>;
}> {
  const offsets = SEQUENCE_SCHEDULES[sequenceType];
  return offsets.map((dayOffset, index) => {
    const scheduledFor = new Date(now);
    scheduledFor.setDate(scheduledFor.getDate() + dayOffset);
    // Schedule for 9 AM ET (13:00 UTC) on the target day
    scheduledFor.setUTCHours(13, 0, 0, 0);

    return {
      lead_id: leadId,
      recipient_email: lead.email,
      recipient_name: lead.company_name,
      sequence_type: sequenceType,
      sequence_step: index + 1,
      scheduled_for: scheduledFor.toISOString(),
      status: 'pending' as const,
      context: context || {},
    };
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: EnqueueRequest = await req.json();
    const { lead_id, sequence_type, context } = body;

    const validationError = validateEnqueueRequest(body);
    if (validationError) {
      return json({ error: validationError }, 400);
    }

    // Check for existing pending sequence (prevent duplicates)
    const { data: existing } = await supabase
      .from('scheduled_emails')
      .select('id')
      .eq('lead_id', lead_id)
      .eq('sequence_type', sequence_type)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (existing) {
      return json({
        success: false,
        reason: 'duplicate',
        message: `A pending ${sequence_type} sequence already exists for this lead`,
      }, 409);
    }

    // Look up the lead to get recipient info
    const { data: lead, error: leadError } = await supabase
      .from('drone_leads')
      .select('email, company_name')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return json({ error: 'Lead not found' }, 404);
    }

    if (!lead.email) {
      return json({ error: 'Lead has no email address' }, 422);
    }

    // Build scheduled email rows
    const rows = buildScheduleRows(lead, lead_id, sequence_type, context || {}, new Date());

    const { data: inserted, error: insertError } = await supabase
      .from('scheduled_emails')
      .insert(rows)
      .select('id, sequence_step, scheduled_for');

    if (insertError) {
      console.error('Failed to enqueue drip:', insertError);
      return json({ error: insertError.message }, 500);
    }

    console.log(`Enqueued ${sequence_type} for lead ${lead_id}: ${inserted.length} emails scheduled`);

    return json({
      success: true,
      lead_id,
      sequence_type,
      emails_scheduled: inserted.length,
      schedule: inserted,
    }, 201);

  } catch (error) {
    console.error('enqueue-drip error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500,
    );
  }
});
