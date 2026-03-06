import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SQUARE_ACCESS_TOKEN = Deno.env.get("SQUARE_ACCESS_TOKEN")!;
const SQUARE_LOCATION_ID = Deno.env.get("SQUARE_LOCATION_ID")!;
const SQUARE_ENV = Deno.env.get("SQUARE_ENVIRONMENT") ?? "sandbox";

const SQUARE_BASE =
  SQUARE_ENV === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";

const SQUARE_API_VERSION = "2024-01-18";

// Returns YYYY-MM-DD date N days from today
function futureDateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { job_id } = body as { job_id: string };

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "job_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the drone job
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select("id, quote_id, preview_urls, status")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guard: job must be in 'complete' status (processing finished, ready for billing)
    if (job.status !== "complete") {
      return new Response(
        JSON.stringify({ error: "Job status must be 'complete'. Current: " + job.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!job.quote_id) {
      return new Response(
        JSON.stringify({ error: "Job has no associated quote" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency guard: check for existing balance payment for this quote
    const { data: existing, error: existingError } = await supabase
      .from("payments")
      .select("id, square_invoice_id, status")
      .eq("quote_id", job.quote_id)
      .eq("payment_type", "balance")
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing payment:", existingError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing payments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existing) {
      return new Response(
        JSON.stringify({
          error: "Balance invoice already exists for this quote",
          existing_payment_id: existing.id,
          existing_square_invoice_id: existing.square_invoice_id,
          status: existing.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch quote with customer info
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("id, total, deposit_amount, quote_requests(name, email, job_type)")
      .eq("id", job.quote_id)
      .maybeSingle();

    if (quoteError || !quote) {
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestInfo = Array.isArray(quote.quote_requests)
      ? quote.quote_requests[0]
      : quote.quote_requests;

    if (!requestInfo?.email) {
      return new Response(
        JSON.stringify({ error: "Customer email not found on quote request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const balanceAmount = Number(quote.total) - Number(quote.deposit_amount);
    const balanceAmountCents = Math.round(balanceAmount * 100);
    const shortId = job_id.slice(0, 8).toUpperCase();

    // ORPHAN PREVENTION: Insert payments row BEFORE calling Square API.
    // If Square fails, we delete this row. This prevents orphaned Square invoices
    // without a matching Supabase record.
    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        quote_id: job.quote_id,
        job_id: job_id,
        payment_type: "balance",
        status: "pending",
        amount: balanceAmount,
        customer_email: requestInfo.email,
        due_date: futureDateStr(15),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert failed:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create payment record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Square invoice (DRAFT state) with SHARE_MANUALLY to prevent Square emails
    const jobType = requestInfo.job_type ?? "aerial services";
    const jobTypeLabel = requestInfo.job_type ?? "Aerial Services";
    const createBody = {
      idempotency_key: "bal-" + job_id,
      invoice: {
        location_id: SQUARE_LOCATION_ID,
        primary_recipient: {
          email_address: requestInfo.email,
        },
        payment_requests: [
          {
            request_type: "BALANCE",
            due_date: futureDateStr(15),
            automatic_payment_source: "NONE",
            reminders: [],
          },
        ],
        delivery_method: "SHARE_MANUALLY",
        invoice_number: "SAI-BAL-" + shortId,
        title: "Sentinel Aerial Inspections - Balance Invoice",
        description: "Balance due for " + jobType + " job " + shortId,
        line_items: [
          {
            name: "Balance Due - " + jobTypeLabel,
            quantity: "1",
            base_price_money: {
              amount: balanceAmountCents,
              currency: "USD",
            },
          },
        ],
      },
    };

    const createResp = await fetch(SQUARE_BASE + "/v2/invoices", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + SQUARE_ACCESS_TOKEN,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_API_VERSION,
      },
      body: JSON.stringify(createBody),
    });

    if (!createResp.ok) {
      const errBody = await createResp.json();
      console.error("Square create invoice failed:", errBody);
      // Rollback: delete the pending payment row
      await supabase.from("payments").delete().eq("id", payment.id);
      return new Response(
        JSON.stringify({ error: "Square invoice creation failed", details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createData = await createResp.json();
    const squareInvoice = createData.invoice;

    // Publish the invoice (public_url only available after publish)
    const publishResp = await fetch(
      SQUARE_BASE + "/v2/invoices/" + squareInvoice.id + "/publish",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + SQUARE_ACCESS_TOKEN,
          "Content-Type": "application/json",
          "Square-Version": SQUARE_API_VERSION,
        },
        body: JSON.stringify({
          idempotency_key: "pub-bal-" + job_id,
          version: squareInvoice.version,
        }),
      }
    );

    if (!publishResp.ok) {
      const errBody = await publishResp.json();
      console.error("Square publish invoice failed:", errBody);
      // Rollback: delete the pending payment row
      await supabase.from("payments").delete().eq("id", payment.id);
      return new Response(
        JSON.stringify({ error: "Square invoice publish failed", square_invoice_id: squareInvoice.id, details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const publishData = await publishResp.json();
    const publishedInvoice = publishData.invoice;

    // Update payments row with Square invoice details from published response
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        square_invoice_id: publishedInvoice.id,
        square_invoice_url: publishedInvoice.public_url ?? null,
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Failed to update payment with Square details:", updateError);
      // Non-fatal: invoice is live, payment row exists, just missing Square IDs
      console.error("RECONCILIATION NEEDED: Square invoice", publishedInvoice.id, "payment", payment.id);
    }

    // Trigger balance due email with previews and payment link
    try {
      const emailResp = await fetch(
        SUPABASE_URL + "/functions/v1/send-balance-due-email",
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_id: job_id,
            payment_id: payment.id,
            square_invoice_url: publishedInvoice.public_url,
          }),
        }
      );

      if (!emailResp.ok) {
        const emailErr = await emailResp.text();
        console.error("Balance due email failed:", emailErr);
        // Non-fatal: invoice is created, email can be resent
      } else {
        console.log("Balance due email triggered successfully");
      }
    } catch (emailError) {
      console.error("Balance due email call failed:", emailError);
      // Non-fatal: invoice is created, email can be resent
    }

    console.log("Balance invoice created: payment=" + payment.id + ", square=" + publishedInvoice.id + ", job=" + job_id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        square_invoice_id: publishedInvoice.id,
        square_invoice_url: publishedInvoice.public_url,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
