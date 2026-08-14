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
import {
  PACKAGE_SELECT_COLUMNS,
  type PackageRow,
  resolvePackages,
} from '../_shared/package-resolver.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Required fields for intake payload validation
export const REQUIRED_FIELDS = ['caller_name', 'caller_phone', 'service_type', 'job_description', 'call_id'] as const;

export type IntakePayload = {
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

/**
 * Shape of the drone_jobs row this function inserts.
 *
 * `status` is constrained to the two public.drone_job_status values this
 * function is allowed to emit. Both were verified against the live enum on
 * 2026-08-14; do not add a third without re-reading the enum, because
 * PostgREST rejects the whole insert on an invalid value.
 */
export type DroneJobInsert = {
  customer_id: string | null;
  client_id: string;
  package_id: string | null;
  status: 'intake' | 'review_pending';
  property_address: string;
  scheduled_date: string | null;
  admin_notes: string;
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

/**
 * Build the drone_jobs row for a voice order.
 *
 * Pure so the two production defects fixed on 2026-08-14 are testable without
 * a database:
 *
 *  1. client_id was never set. drone_jobs carries BOTH customer_id (the
 *     drone_jobs FK target) and client_id (the FK to clients). Paula's
 *     lookup_customer tool queries drone_jobs by client_id, so a job created
 *     with customer_id alone was invisible to Paula on the caller's next call
 *     and she told returning customers "No active jobs". Verified on
 *     DJ-2026-0005. client_id is already in scope from findOrCreateClient, it
 *     simply was not passed.
 *
 *  2. An unmatched service_type fell through to the cheapest active package.
 *     That is a wrong answer wearing the costume of a right one: nothing
 *     errored, nothing logged, and the job looked correctly priced. There is
 *     now NO fallback. An unmatched service_type leaves package_id null, puts
 *     the job in review_pending so a human sees it, and records the exact
 *     unmatched value in admin_notes so the reason is on the record.
 *
 * `packagesUnavailable` covers the case where the catalogue query itself
 * failed. That is treated identically to "no match": we would rather route a
 * job to a human than guess at what the customer bought.
 */
export function buildDroneJobInsert(args: {
  payload: IntakePayload;
  client_id: string;
  customer_id: string | null;
  packages: PackageRow[] | null | undefined;
  packagesUnavailable?: boolean;
}): { insert: DroneJobInsert; matchedOn: string | null; matchedCode: string | null } {
  const { payload, client_id, customer_id, packages, packagesUnavailable } = args;

  const resolution = packagesUnavailable
    ? { matches: [] as PackageRow[], matchedOn: null, normalizedKey: null }
    : resolvePackages(packages ?? [], payload.service_type);

  const pkg = resolution.matches[0] ?? null;

  const baseNotes =
    `Voice order via Vapi. Call ID: ${payload.call_id}. ` +
    `Service: ${payload.service_type}. Description: ${payload.job_description}`;

  // No silent default. If we could not identify the package, say so loudly on
  // the record and hand the job to a human.
  const reviewNote = packagesUnavailable
    ? ` [NEEDS REVIEW] Package catalogue could not be read at intake, so no ` +
      `package was bound. Unmatched service_type: "${payload.service_type}". ` +
      `package_id is null — select the correct package before scheduling or invoicing.`
    : ` [NEEDS REVIEW] No active drone_package matched service_type ` +
      `"${payload.service_type}". package_id is null — select the correct ` +
      `package before scheduling or invoicing. Nothing was auto-selected on purpose.`;

  return {
    insert: {
      customer_id,
      client_id,
      package_id: pkg?.id ?? null,
      status: pkg ? 'intake' : 'review_pending',
      property_address:
        payload.property_address || `Address pending (voice order from ${payload.caller_name})`,
      scheduled_date: payload.preferred_date || null,
      admin_notes: pkg ? baseNotes : baseNotes + reviewNote,
    },
    matchedOn: resolution.matchedOn,
    matchedCode: pkg?.code ?? null,
  };
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

  // Try to find existing client by phone (check both raw and normalized).
  // Uses separate .eq() filters instead of a string-interpolated .or() so
  // caller-supplied phone values (commas, parens, PostgREST operators)
  // cannot inject or malform the filter.
  const { data: existingRaw } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', phone)
    .limit(1)
    .maybeSingle();

  if (existingRaw) {
    return { client_id: existingRaw.id, created: false };
  }

  if (normalizedPhone && normalizedPhone !== phone) {
    const { data: existingNormalized } = await supabase
      .from('clients')
      .select('id')
      .eq('phone', normalizedPhone)
      .limit(1)
      .maybeSingle();

    if (existingNormalized) {
      return { client_id: existingNormalized.id, created: false };
    }
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

    // Step 5: For voice_bot orders, create a drone_job directly.
    // The customer already agreed on the phone so we skip the manual
    // quote review flow and put the job straight into intake status.
    let drone_job_id: string | null = null;
    try {
      // Upsert into the customers table (drone_jobs FK target, separate from clients)
      const { data: customerResult, error: custError } = await supabase
        .rpc('upsert_customer_from_quote_request', { p_qr_id: qr.id });

      if (custError) {
        console.error('Customer upsert failed (non-fatal):', custError.message);
      } else {
        const customer_id = customerResult as string;

        // Resolve the package against the LIVE catalogue using the same
        // shared resolver Paula's get_package_pricing tool uses, so what the
        // caller was quoted on the phone is what gets bound to the job.
        //
        // The whole active catalogue is fetched and matched in memory rather
        // than filtered with .or(). caller-supplied service_type must never be
        // interpolated into a PostgREST filter — see the same hardening note
        // on findOrCreateClient above. The catalogue is ~13 rows.
        const { data: packages, error: pkgError } = await supabase
          .from('drone_packages')
          .select(PACKAGE_SELECT_COLUMNS)
          .eq('active', true)
          .order('price', { ascending: true });

        if (pkgError) {
          console.error('drone_packages query failed:', pkgError.message);
        }

        const { insert: jobInsert, matchedOn, matchedCode } = buildDroneJobInsert({
          payload,
          client_id,
          customer_id,
          packages: packages as unknown as PackageRow[] | null,
          packagesUnavailable: Boolean(pkgError),
        });

        if (jobInsert.package_id) {
          console.log(
            `Voice order: service_type="${payload.service_type}" matched ${matchedCode} on ${matchedOn}`,
          );
        } else {
          // Loud on purpose. The old behaviour here was silence plus the
          // cheapest active package.
          console.error(
            `Voice order: NO package matched service_type="${payload.service_type}". ` +
              `Job flagged review_pending with package_id null.`,
          );
        }

        // Create drone_job. client_id is what Paula's lookup_customer queries
        // on; omitting it hides the job from her on the next call.
        const { data: job, error: jobError } = await supabase
          .from('drone_jobs')
          .insert(jobInsert)
          .select('id')
          .single();

        if (jobError) {
          console.error('Drone job creation failed (non-fatal):', jobError.message);
        } else {
          drone_job_id = job.id;
          console.log(`Voice order: drone_job created ${drone_job_id}`);
        }

        // Create admin notification (the DB trigger will send the email)
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_email: 'info@faithandharmonyllc.com',
            type: 'voice_order',
            title: jobInsert.package_id
              ? `Voice order from ${payload.caller_name}`
              : `Voice order from ${payload.caller_name} — package needs review`,
            body: jobInsert.package_id
              ? `${payload.service_type}: ${payload.job_description.substring(0, 150)}`
              : `No package matched service_type "${payload.service_type}". ` +
                `Job is in review_pending with no package attached. ` +
                `${payload.job_description.substring(0, 150)}`,
            link: drone_job_id ? `/admin/drone-jobs/${drone_job_id}` : '/admin/quote-requests',
          });

        if (notifError) {
          console.warn('Notification insert warning (non-fatal):', notifError.message);
        }
      }
    } catch (stepError) {
      // Voice order job creation is best-effort. The quote_request and lead
      // are already saved, so the admin can still act on them manually.
      console.error('Voice order drone_job step failed (non-fatal):', stepError);
    }

    console.log(`Intake: client=${client_id} (new=${clientCreated}) qr=${qr.id} lead=${lead.id} job=${drone_job_id || 'none'}`);

    return json({
      success: true,
      quote_request_id: qr.id,
      lead_id: lead.id,
      client_id,
      client_created: clientCreated,
      drone_job_id,
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
