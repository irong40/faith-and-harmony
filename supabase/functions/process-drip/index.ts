// Process Drip Edge Function
//
// Called on a cron schedule by n8n (WF7).
// Queries scheduled_emails for pending emails due now,
// resolves the template, sends via Resend with tracking pixel,
// and updates the row status.
//
// Auto-skips emails if the lead status has changed to 'client'
// (for outreach_drip only) or if the lead email is missing.
//
// Auth: service role (called by n8n with Authorization header)
// Method: POST only

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Resend } from 'npm:resend@2.0.0';
import { getTemplate } from './templates.ts';
import type { BrandConfig, TemplateContext } from './templates.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const BATCH_LIMIT = 20;

/** Determine if a scheduled email should be skipped. Returns skip reason or null. */
export function shouldSkipEmail(
  sequenceType: string,
  leadStatus: string | null,
  hasNotInterestedLog: boolean,
): string | null {
  if (sequenceType === 'outreach_drip' && leadStatus === 'client') {
    return 'Lead already converted to client';
  }
  if (sequenceType === 'outreach_drip' && hasNotInterestedLog) {
    return 'Lead marked not interested';
  }
  return null;
}

/** Inject a 1x1 tracking pixel before </body>. */
export function injectTrackingPixel(html: string, trackingId: string, supabaseUrl: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-email?t=${trackingId}&a=open`;
  return html.replace(
    '</body>',
    `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`,
  );
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return json({ error: 'RESEND_API_KEY not configured' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    // Fetch due emails
    const { data: dueEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(BATCH_LIMIT);

    if (fetchError) {
      console.error('Failed to fetch due emails:', fetchError);
      return json({ error: fetchError.message }, 500);
    }

    if (!dueEmails || dueEmails.length === 0) {
      return json({ processed: 0, message: 'No emails due' });
    }

    console.log(`Processing ${dueEmails.length} due emails`);

    // Resolve brand config (use SAI brand for all drip emails)
    const { data: brandRow } = await supabase
      .from('brands')
      .select('company_name, tagline, color_primary, color_accent, color_cta, color_light, from_email, reply_to')
      .eq('slug', 'sai')
      .maybeSingle();

    const brand: BrandConfig = {
      navy: brandRow?.color_primary ?? '#1C1C1C',
      sky: brandRow?.color_cta ?? '#FF6B35',
      accent: brandRow?.color_accent ?? '#FF6B35',
      light: brandRow?.color_light ?? '#F5F5F0',
      companyName: brandRow?.company_name ?? 'Sentinel Aerial Inspections',
      tagline: brandRow?.tagline ?? 'Professional Drone Services',
      fromEmail: brandRow?.from_email ?? 'info@faithandharmonyllc.com',
      replyTo: brandRow?.reply_to ?? 'info@faithandharmonyllc.com',
      phone: '757.843.8772',
      website: 'sentinelaerialinspections.com',
    };

    const results = { sent: 0, skipped: 0, failed: 0, errors: [] as string[] };

    for (const email of dueEmails) {
      try {
        // Check if lead still qualifies for this sequence
        if (email.lead_id) {
          const { data: lead } = await supabase
            .from('drone_leads')
            .select('status, email')
            .eq('id', email.lead_id)
            .single();

          // Check outreach_log for not_interested outcome
          const { data: notInterested } = await supabase
            .from('outreach_log')
            .select('id')
            .eq('lead_id', email.lead_id)
            .eq('outcome', 'not_interested')
            .limit(1)
            .maybeSingle();

          const skipReason = shouldSkipEmail(
            email.sequence_type,
            lead?.status ?? null,
            !!notInterested,
          );

          if (skipReason) {
            await supabase
              .from('scheduled_emails')
              .update({ status: 'skipped', skip_reason: skipReason })
              .eq('id', email.id);
            results.skipped++;
            continue;
          }
        }

        // Resolve template
        const templateCtx: TemplateContext = {
          recipient_name: email.recipient_name || '',
          recipient_email: email.recipient_email,
          lead_id: email.lead_id,
          context: email.context || {},
        };

        const template = getTemplate(email.sequence_type, email.sequence_step, templateCtx, brand);
        if (!template) {
          await supabase
            .from('scheduled_emails')
            .update({ status: 'skipped', skip_reason: `No template for ${email.sequence_type} step ${email.sequence_step}` })
            .eq('id', email.id);
          results.skipped++;
          continue;
        }

        // Create tracking record
        const { data: trackingRecord, error: trackingError } = await supabase
          .from('email_tracking')
          .insert({
            lead_id: email.lead_id,
            recipient_email: email.recipient_email,
            subject: template.subject,
            body: `[drip] ${email.sequence_type} step ${email.sequence_step}`,
            status: 'sending',
          })
          .select('id, tracking_id')
          .single();

        if (trackingError) {
          console.error(`Tracking record failed for ${email.id}:`, trackingError);
          results.failed++;
          results.errors.push(`Tracking: ${trackingError.message}`);
          continue;
        }

        // Inject tracking pixel into HTML
        const htmlWithPixel = injectTrackingPixel(template.html, trackingRecord.tracking_id, supabaseUrl);

        // Send via Resend
        const { data: emailResult, error: emailError } = await resend.emails.send({
          from: `${brand.companyName} <${brand.fromEmail}>`,
          to: [email.recipient_email],
          reply_to: brand.replyTo,
          subject: template.subject,
          html: htmlWithPixel,
        });

        if (emailError) {
          console.error(`Send failed for ${email.id}:`, emailError);

          await supabase
            .from('email_tracking')
            .update({ status: 'failed', error_message: emailError.message })
            .eq('id', trackingRecord.id);

          await supabase
            .from('scheduled_emails')
            .update({ status: 'skipped', skip_reason: `Send failed: ${emailError.message}` })
            .eq('id', email.id);

          results.failed++;
          results.errors.push(emailError.message);
          continue;
        }

        // Update tracking as sent
        await supabase
          .from('email_tracking')
          .update({ status: 'sent' })
          .eq('id', trackingRecord.id);

        // Update scheduled email as sent
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            email_tracking_id: trackingRecord.id,
          })
          .eq('id', email.id);

        // Log outreach
        if (email.lead_id) {
          await supabase
            .from('outreach_log')
            .insert({
              lead_id: email.lead_id,
              contact_method: 'email',
              outcome: 'email_sent',
              notes: `[drip] ${email.sequence_type} step ${email.sequence_step}: "${template.subject}"`,
            });

          // Update lead status to 'contacted' if still 'new'
          if (email.sequence_type === 'outreach_drip' && email.sequence_step === 1) {
            await supabase
              .from('drone_leads')
              .update({ status: 'contacted' })
              .eq('id', email.lead_id)
              .eq('status', 'new');
          }
        }

        console.log(`Sent ${email.sequence_type}[${email.sequence_step}] to ${email.recipient_email}`);
        results.sent++;

      } catch (emailErr) {
        console.error(`Error processing email ${email.id}:`, emailErr);
        results.failed++;
        results.errors.push(emailErr instanceof Error ? emailErr.message : 'Unknown error');
      }
    }

    console.log(`Drip processing complete: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`);

    return json({
      processed: dueEmails.length,
      ...results,
    });

  } catch (error) {
    console.error('process-drip error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      500,
    );
  }
});
