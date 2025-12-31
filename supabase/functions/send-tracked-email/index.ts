import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailRequest {
  leadId: string;
  recipientEmail: string;
  subject: string;
  body: string;
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
      throw new Error('RESEND_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);
    
    const { leadId, recipientEmail, subject, body }: SendEmailRequest = await req.json();
    
    console.log(`Sending tracked email to ${recipientEmail} for lead ${leadId}`);

    // Create tracking record first to get tracking ID
    const { data: trackingRecord, error: trackingError } = await supabase
      .from('email_tracking')
      .insert({
        lead_id: leadId,
        recipient_email: recipientEmail,
        subject,
        body,
        status: 'sending'
      })
      .select()
      .single();

    if (trackingError) {
      console.error('Failed to create tracking record:', trackingError);
      throw new Error('Failed to create tracking record');
    }

    const trackingId = trackingRecord.tracking_id;
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/track-email?t=${trackingId}&a=open`;
    
    // Convert plain text body to HTML with tracking pixel
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
          .signature-name { font-weight: bold; color: #1a1a2e; }
          .signature-company { color: #666; }
        </style>
      </head>
      <body>
        ${body.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
        <div class="signature">
          <p class="signature-name">Faith & Harmony LLC</p>
          <p class="signature-company">Professional Aerial Photography Services</p>
          <p><a href="https://faithandharmonyllc.com?ref=${trackingId}">faithandharmonyllc.com</a></p>
        </div>
        <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
      </body>
      </html>
    `;

    // Send email via Resend
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: 'Faith & Harmony <info@faithandharmonyllc.com>',
      to: [recipientEmail],
      subject: subject,
      html: htmlBody,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      
      // Update tracking record with error
      await supabase
        .from('email_tracking')
        .update({
          status: 'failed',
          error_message: emailError.message
        })
        .eq('id', trackingRecord.id);
      
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log('Email sent successfully:', emailResult);

    // Update tracking record as sent
    await supabase
      .from('email_tracking')
      .update({ status: 'sent' })
      .eq('id', trackingRecord.id);

    // Log outreach
    await supabase
      .from('outreach_log')
      .insert({
        lead_id: leadId,
        contact_method: 'email',
        outcome: 'sent',
        notes: `Sent AI-drafted email: "${subject}"`
      });

    return new Response(JSON.stringify({
      success: true,
      trackingId,
      emailId: emailResult?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-tracked-email:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
