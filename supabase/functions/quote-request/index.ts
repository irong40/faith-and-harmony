import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NOTE: inquiries@sentinelaerial.com must be verified in Resend (same domain as contact@sentinelaerial.com)
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface QuoteRequest {
  name: string;
  email: string;
  phone: string;
  service_type: string;
  preferred_date: string;
  message: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, service_type, preferred_date, message } =
      (await req.json()) as QuoteRequest;

    if (!name || !email || !phone || !service_type || !preferred_date) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
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

Reply directly to this email to respond to the prospect.`;

    const emailResponse = await resend.emails.send({
      from: "Sentinel Aerial Inquiries <inquiries@sentinelaerial.com>",
      to: ["contact@sentinelaerial.com"],
      replyTo: email,
      subject: `New Quote Request: ${service_type} from ${name}`,
      text: emailBody,
    });

    console.log("Quote request email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Quote request error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
