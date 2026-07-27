import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
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

  try {
    // Auth guard — validate caller is authenticated admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      .select("id, quote_id, preview_urls, status, job_price, job_number, client_id, clients(name, email)")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guard: the job must have reached a billable state. 'delivered' is included
    // because DeliveryReview's "Send Balance Invoice" button lives on a job that
    // has just been delivered — the old 'complete'-only check 400'd exactly the
    // caller it was written for.
    const BILLABLE_STATUSES = ["complete", "delivered", "photos_delivered", "paid"];
    if (!BILLABLE_STATUSES.includes(job.status)) {
      return new Response(
        JSON.stringify({
          error: "Job is not billable yet. Status must be one of " +
            BILLABLE_STATUSES.join(", ") + ". Current: " + job.status,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency guard: an existing balance payment for EITHER key.
    // .limit(1) rather than .maybeSingle() — on_drone_job_delivered may already
    // have written a row, and maybeSingle() throws on more than one.
    let existingQuery = supabase
      .from("payments")
      .select("id, square_invoice_id, status, amount, customer_email")
      .eq("payment_type", "balance")
      .limit(1);

    existingQuery = job.quote_id
      ? existingQuery.eq("quote_id", job.quote_id)
      : existingQuery.eq("job_id", job_id);

    const { data: existingRows, error: existingError } = await existingQuery;

    if (existingError) {
      console.error("Error checking existing payment:", existingError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing payments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existing = existingRows?.[0] ?? null;

    // A row WITHOUT square_invoice_id is the trigger's handiwork: the payment
    // exists but no Square invoice was ever cut. Adopt it instead of 409-ing.
    if (existing?.square_invoice_id) {
      return new Response(
        JSON.stringify({
          error: "Balance invoice already exists",
          existing_payment_id: existing.id,
          existing_square_invoice_id: existing.square_invoice_id,
          status: existing.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let balanceAmount = 0;
    let recipientEmail: string | null = null;
    let jobTypeName: string | null = null;

    if (job.quote_id) {
      // ---- quote path ----
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

      const info = Array.isArray(quote.quote_requests)
        ? quote.quote_requests[0]
        : quote.quote_requests;

      recipientEmail = info?.email ?? null;
      jobTypeName = info?.job_type ?? null;
      balanceAmount = Number(quote.total) - Number(quote.deposit_amount);
    } else {
      // ---- direct path ----
      // No quote was ever raised. job_price is DOLLARS (migration 20260728091000).
      // Net off any deposit already collected against this job.
      const client = Array.isArray(job.clients) ? job.clients[0] : job.clients;
      recipientEmail = client?.email ?? null;
      jobTypeName = job.job_number ?? null;

      const { data: deposits } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("job_id", job_id)
        .eq("payment_type", "deposit");

      const depositTotal = (deposits ?? [])
        .filter((d) => d.status !== "waived")
        .reduce((sum, d) => sum + Number(d.amount ?? 0), 0);

      balanceAmount = Number(job.job_price ?? 0) - depositTotal;
    }

    // An adopted row's amount wins — it is what the trigger already computed.
    if (existing?.amount != null) {
      balanceAmount = Number(existing.amount);
      recipientEmail = recipientEmail ?? existing.customer_email ?? null;
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({
          error: job.quote_id
            ? "Customer email not found on quote request"
            : "Client has no email on file — assign a client with an email to invoice",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!(balanceAmount > 0)) {
      return new Response(
        JSON.stringify({
          error: "Nothing left to bill (balance resolves to " + balanceAmount + ")",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestInfo = { email: recipientEmail, job_type: jobTypeName };
    const balanceAmountCents = Math.round(balanceAmount * 100);
    const shortId = job_id.slice(0, 8).toUpperCase();

    // ORPHAN PREVENTION: have a payments row BEFORE calling Square. If Square
    // fails we roll it back — but only if WE created it. A row the trigger
    // wrote is never deleted here; it stays for a later retry.
    let paymentId = existing?.id ?? null;
    const adopted = paymentId !== null;

    if (!adopted) {
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
      paymentId = payment.id;
    }

    const payment = { id: paymentId! };

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
      // Rollback: only delete a row THIS call created. An adopted row was
      // written by on_drone_job_delivered and must survive for a retry.
      if (!adopted) {
        await supabase.from("payments").delete().eq("id", payment.id);
      }
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
      // Rollback: only delete a row THIS call created. An adopted row was
      // written by on_drone_job_delivered and must survive for a retry.
      if (!adopted) {
        await supabase.from("payments").delete().eq("id", payment.id);
      }
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
