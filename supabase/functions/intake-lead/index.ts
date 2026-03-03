// Intake Lead Edge Function
// Phase 1: Intake API and Lead Tracking (INTAKE-03)
//
// Receives structured call data from n8n after a Vapi call ends.
// Creates or matches a client by phone, creates a quote request
// (feeding into the existing admin workflow), and creates a lead
// record linking the call to the request.
//
// Auth: x-webhook-secret header (shared secret with n8n)
// Method: POST only
//
// Endpoints:
//   POST / - Create lead from call data
//   OPTIONS / - CORS preflight

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Required fields for intake payload validation
export const REQUIRED_FIELDS = ['caller_name', 'caller_phone', 'service_type', 'job_description', 'call_id'] as const;

type IntakePayload = {
  caller_name: string;
  caller_phone: string;
  caller_email?: string;
  service_type: string;
  job_description: string;
  call_id: string;
  property_address?: string;
  preferred_date?: string;
  qualification_status?: string;
  sentiment?: string;
};

// Pure function: validate webhook secret
export function validateWebhookSecret(headerValue: string | null, envSecret: string): boolean {
  if (!headerValue || !envSecret) return false;
  return headerValue === envSecret;
}

// Pure function: validate required fields
export function validateRequiredFields(body: Record<string, unknown>): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!body[field] || (typeof body[field] === 'string' && (body[field] as string).trim() === '')) {
      missing.push(field);
    }
  }
  return { valid: missing.length === 0, missing };
}

// Pure function: normalize phone number by stripping non-digits
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Find existing client by phone or create a new one
async function findOrCreateClient(
  supabase: ReturnType<typeof createClient>,
  { name, phone, email }: { name: string; phone: string; email?: string }
): Promise<{ client_id: string; created: boolean }> {
  const normalizedPhone = normalizePhone(phone);

  // Try to find existing client by phone (check both raw and normalized)
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .or(`phone.eq.${phone},phone.eq.${normalizedPhone}`)
    .limit(1)
    .single();

  if (existing) {
    return { client_id: existing.id, created: false };
  }

  // Create new client
  const { data: newClient, error } = await supabase
    .from('clients')
    .insert({
      name,
      phone,
      email: email || null,
      created_by: null,
    })
    .select('id')
    .single();

  if (error) throw error;
  return { client_id: newClient.id, created: true };
}

export async function handleRequest(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // POST only
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // Webhook secret validation
  const secret = req.headers.get('x-webhook-secret');
  const envSecret = Deno.env.get('INTAKE_WEBHOOK_SECRET') || '';
  if (!validateWebhookSecret(secret, envSecret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Parse and validate body
    const body = await req.json() as Record<string, unknown>;
    const validation = validateRequiredFields(body);
    if (!validation.valid) {
      return json({ error: `Missing required fields: ${validation.missing.join(', ')}` }, 400);
    }

    const payload = body as unknown as IntakePayload;

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Step 1: Find or create client by phone
    const { client_id, created: clientCreated } = await findOrCreateClient(supabase, {
      name: payload.caller_name,
      phone: payload.caller_phone,
      email: payload.caller_email,
    });

    // Step 2: Create quote request (feeds into existing admin workflow)
    const { data: qr, error: qrError } = await supabase
      .from('quote_requests')
      .insert({
        name: payload.caller_name,
        email: payload.caller_email || null,
        phone: payload.caller_phone,
        address: payload.property_address || null,
        job_type: payload.service_type,
        description: payload.job_description,
        status: 'new',
        source: 'voice_bot',
      })
      .select('id')
      .single();

    if (qrError) {
      console.error('Quote request insert failed:', qrError);
      return json({ error: qrError.message }, 500);
    }

    // Step 3: Create lead record linking client and quote request
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        caller_name: payload.caller_name,
        caller_phone: payload.caller_phone,
        caller_email: payload.caller_email || null,
        source_channel: 'voice_bot',
        call_id: payload.call_id,
        qualification_status: payload.qualification_status || 'pending',
        client_id,
        quote_request_id: qr.id,
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('Lead insert failed:', leadError);
      return json({ error: leadError.message }, 500);
    }

    // Step 4: Optional - update vapi_call_logs with sentiment and lead link
    if (payload.sentiment || payload.call_id) {
      const updateData: Record<string, unknown> = { lead_id: lead.id };
      if (payload.sentiment) updateData.sentiment = payload.sentiment;
      if (payload.qualification_status) updateData.outcome = payload.qualification_status;

      // Do not fail the request if this update finds no matching call log row
      // (the log may not exist yet if n8n calls intake before call logging completes)
      const { error: updateError } = await supabase
        .from('vapi_call_logs')
        .update(updateData)
        .eq('call_id', payload.call_id);

      if (updateError) {
        console.warn('vapi_call_logs update warning (non-fatal):', updateError.message);
      }
    }

    console.log(`Intake: client=${client_id} (new=${clientCreated}) qr=${qr.id} lead=${lead.id}`);

    return json({
      success: true,
      quote_request_id: qr.id,
      lead_id: lead.id,
      client_id,
      client_created: clientCreated,
    }, 201);

  } catch (error) {
    console.error('Intake-lead error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500,
    );
  }
}

serve(handleRequest);
