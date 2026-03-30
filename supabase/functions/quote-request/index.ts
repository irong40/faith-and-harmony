import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: inquiries@faithandharmonyllc.com must be verified in Resend
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface QuoteRequest {
  name: string;
  email: string;
  phone: string;
  service_type: string;
  preferred_date: string;
  message: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, service_type, preferred_date, message, utm_source, utm_medium, utm_campaign } =
      (await req.json()) as QuoteRequest;

    if (!name || !email || !service_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert into quote_requests table (service role bypasses RLS)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: quoteRow, error: dbError } = await supabase
      .from("quote_requests")
      .insert({
        name,
        email,
        phone,
        address: null,
        job_type: service_type,
        description: message || `${service_type}${preferred_date ? ` — preferred date: ${preferred_date}` : ''}`,
        preferred_date: preferred_date || null,
        source: "web",
        status: "new",
        brand_slug: "sai",
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Failed to insert quote_request:", dbError);
      // Continue to send email even if DB insert fails — don't lose the lead
    } else {
      console.log("Quote request saved:", quoteRow.id);
    }

    // Send notification email
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      // If DB insert succeeded, still return success — the quote is saved
      if (quoteRow) {
        return new Response(
          JSON.stringify({ success: true, quote_request_id: quoteRow.id, email_sent: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const emailBody = `New quote request submitted from the Sentinel website.

Name: ${name}
Email: ${email}
Phone: ${phone}
Service Type: ${service_type}
Preferred Date: ${preferred_date}
Message: ${message || "(none)"}
${quoteRow ? `\nQuote Request ID: ${quoteRow.id}` : ""}
Reply directly to this email to respond to the prospect.`;

    const emailResponse = await resend.emails.send({
      from: "Sentinel Aerial Inquiries <inquiries@faithandharmonyllc.com>",
      to: ["info@faithandharmonyllc.com"],
      replyTo: email,
      subject: `New Quote Request: ${service_type} from ${name}`,
      text: emailBody,
    });

    console.log("Quote request email sent:", emailResponse);

    // Send confirmation email to the prospect (non-fatal)
    if (quoteRow) {
      try {
        const confirmUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/quote-confirmation-email`;
        await fetch(confirmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            request_id: quoteRow.id,
            name,
            email,
            job_type: service_type,
            description: message || service_type,
            brand_slug: "sai",
          }),
        });
        console.log("Confirmation email sent to prospect:", email);
      } catch (confirmErr) {
        console.warn("Confirmation email failed (non-fatal):", confirmErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        quote_request_id: quoteRow?.id || null,
        email_sent: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quote request error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process quote request" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
