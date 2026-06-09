import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sender must be a verified Resend identity. info@faithandharmonyllc.com is
// verified and delivers reliably; inquiries@ was not verified, which silently
// dropped every quote-request notification.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// OPORD drafting is handled by the LOCAL pull poller (opord_intake.py watch),
// which polls quote_requests for web-form leads and drafts proposals — so this
// function just persists + emails the lead. No webhook forward, no exposed port,
// no secrets. (The draft links back via opord_proposals.quote_request_id.)

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isoDate = (v: unknown): string | null =>
  typeof v === "string" && ISO_DATE.test(v.trim()) ? v.trim() : null;

const clean = (v: unknown): string | null => {
  const s = (v ?? "").toString().trim();
  return s ? s : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // ── Honeypot: a filled hidden field means a bot. Ack 200, do nothing. ──
    if (clean(body.website_hp)) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Normalize new (public /quote form) and legacy payloads ──────────────
    // New: { raw_intake, source, full_name, email, phone, company, job_type,
    //        location, target_date, deliverable_pref, referral_source, utm_* }
    // Legacy: { name, email, phone, service_type, preferred_date, message, utm_* }
    const name = clean(body.full_name) ?? clean(body.name);
    const email = clean(body.email);
    const phone = clean(body.phone);
    const company = clean(body.company);
    const location = clean(body.location);
    const jobType = clean(body.job_type) ?? clean(body.service_type);
    const targetDate = isoDate(body.target_date) ?? isoDate(body.preferred_date);
    const source = clean(body.source) ?? (body.raw_intake ? "web_form" : "web");

    // description is NOT NULL in quote_requests — always provide something.
    // raw_intake (the composed prose) is the canonical description for new leads.
    const rawIntake = clean(body.raw_intake);
    const description =
      rawIntake ??
      clean(body.message) ??
      [jobType, targetDate ? `target date: ${targetDate}` : null].filter(Boolean).join(" — ") ??
      "Quote request";

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (name, email)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Persist the lead (service role bypasses RLS) ────────────────────────
    const { data: quoteRow, error: dbError } = await supabase
      .from("quote_requests")
      .insert({
        name,
        email,
        phone,
        address: location,        // form `location` → quote_requests.address
        job_type: jobType,
        description,              // form `raw_intake` → quote_requests.description
        preferred_date: targetDate,
        source,
        status: "new",
        brand_slug: "sai",
        utm_source: clean(body.utm_source),
        utm_medium: clean(body.utm_medium),
        utm_campaign: clean(body.utm_campaign),
        utm_content: clean(body.utm_content),
        utm_term: clean(body.utm_term),
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Failed to insert quote_request:", dbError);
      // Continue — never lose the lead; email below is the fallback record.
    } else {
      console.log("Quote request saved:", quoteRow.id);
    }

    // OPORD draft is generated asynchronously by the local pull poller
    // (opord_intake.py watch) from the saved raw_intake — nothing to forward here.

    // ── Notify the team (reply-to prospect) ─────────────────────────────────
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);
      const emailBody = `New quote request from the Sentinel website.

Name: ${name}${company ? ` (${company})` : ""}
Email: ${email}
Phone: ${phone ?? "(none)"}
Location: ${location ?? "(none)"}
Job Type: ${jobType ?? "(not sure)"}
Target Date: ${targetDate ?? "(flexible)"}

Details:
${description}
${quoteRow ? `\nQuote Request ID: ${quoteRow.id}` : ""}
Reply directly to this email to respond to the prospect.`;

      try {
        await resend.emails.send({
          from: "Sentinel Aerial Inquiries <info@faithandharmonyllc.com>",
          to: ["info@faithandharmonyllc.com"],
          cc: ["draopierce@faithandharmonyllc.com"],
          replyTo: email,
          subject: `New Quote Request: ${jobType ?? "general"} from ${name}`,
          text: emailBody,
        });
        console.log("Quote request email sent");
      } catch (mailErr) {
        console.warn("Notification email failed (non-fatal):", String(mailErr));
      }
    } else {
      console.error("RESEND_API_KEY not configured");
    }

    // ── In-app bell + prospect confirmation (existing behavior, non-fatal) ──
    if (quoteRow) {
      const { error: notifError } = await supabase.from("notifications").insert({
        user_email: "info@faithandharmonyllc.com",
        type: "quote_request",
        title: `New web quote request from ${name}`,
        body: `${jobType ?? "general"}${description ? `: ${description.substring(0, 150)}` : ""}`,
        link: "/admin/quote-requests",
        send_email: false,
      });
      if (notifError) console.warn("Bell notification warning (non-fatal):", notifError.message);

      try {
        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/quote-confirmation-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            request_id: quoteRow.id,
            name,
            email,
            job_type: jobType,
            description,
            brand_slug: "sai",
          }),
        });
      } catch (confirmErr) {
        console.warn("Confirmation email failed (non-fatal):", String(confirmErr));
      }
    }

    // Lead is saved + emailed; return 200 regardless of forward/email outcome.
    return new Response(
      JSON.stringify({ success: true, quote_request_id: quoteRow?.id ?? null }),
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
