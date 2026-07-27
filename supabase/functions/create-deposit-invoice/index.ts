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
    const { quote_id: rawQuoteId, job_id: rawJobId } = body as {
      quote_id?: string;
      job_id?: string;
    };

    if (!rawQuoteId && !rawJobId) {
      return new Response(
        JSON.stringify({ error: "quote_id or job_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ------------------------------------------------------------------
    // Resolve the billing source.
    //
    // Quote path  : quote_id (or a job_id whose job carries a quote_id).
    // Direct path : job_id only — a mission booked without ever going through
    //               the quote flow. 17 of 21 live drone_jobs are in this state,
    //               and until payments.quote_id was made nullable there was no
    //               legal payments row to write for any of them.
    // ------------------------------------------------------------------
    let quote_id: string | null = rawQuoteId ?? null;
    let job_id: string | null = rawJobId ?? null;
    let recipientEmail: string | null = null;
    let jobTypeLabel: string | null = null;
    let depositAmount = 0;

    if (job_id) {
      const { data: job, error: jobError } = await supabase
        .from("drone_jobs")
        .select("id, quote_id, job_price, client_id, job_number, clients(name, email)")
        .eq("id", job_id)
        .maybeSingle();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: "Job not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      quote_id = quote_id ?? job.quote_id ?? null;

      if (!quote_id) {
        const client = Array.isArray(job.clients) ? job.clients[0] : job.clients;
        recipientEmail = client?.email ?? null;
        jobTypeLabel = job.job_number ?? "aerial services";
        // job_price is DOLLARS (see migration 20260728091000). Direct-booked
        // deposits mirror the 50% the invoice copy already advertises.
        depositAmount = Math.round(Number(job.job_price ?? 0) * 0.5 * 100) / 100;
      }
    }

    // Idempotency guard: an existing deposit payment for EITHER key.
    // .limit(1) rather than .maybeSingle() — the trigger and this function can
    // both have written, and maybeSingle() throws on more than one row.
    let existingQuery = supabase
      .from("payments")
      .select("id, square_invoice_id, status, amount, customer_email")
      .eq("payment_type", "deposit")
      .limit(1);

    existingQuery = quote_id
      ? existingQuery.eq("quote_id", quote_id)
      : existingQuery.eq("job_id", job_id!);

    const { data: existingRows, error: existingError } = await existingQuery;

    if (existingError) {
      console.error("Error checking existing payment:", existingError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing payments" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existing = existingRows?.[0] ?? null;

    // Only a payment that already carries a Square invoice is a true duplicate.
    // A row WITHOUT square_invoice_id is what on_drone_job_delivered leaves
    // behind — that is the "payment rows exist but no Square invoice is ever
    // cut" case, and the right answer is to adopt the row, not to 409 on it.
    if (existing?.square_invoice_id) {
      return new Response(
        JSON.stringify({
          error: "Deposit invoice already exists",
          existing_payment_id: existing.id,
          existing_square_invoice_id: existing.square_invoice_id,
          status: existing.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (quote_id) {
      // Fetch quote with customer email from quote_requests
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select(`
          id,
          status,
          total,
          deposit_amount,
          quote_requests (
            name,
            email,
            job_type
          )
        `)
        .eq("id", quote_id)
        .maybeSingle();

      if (quoteError || !quote) {
        return new Response(
          JSON.stringify({ error: "Quote not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Guard: only accepted quotes trigger deposit
      if (quote.status !== "accepted") {
        return new Response(
          JSON.stringify({ error: `Quote status must be 'accepted'. Current: ${quote.status}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const requestInfo = Array.isArray(quote.quote_requests)
        ? quote.quote_requests[0]
        : quote.quote_requests;

      recipientEmail = requestInfo?.email ?? null;
      jobTypeLabel = requestInfo?.job_type ?? null;
      depositAmount = Number(quote.deposit_amount);
    }

    // An adopted row's amount wins — it is what the trigger already computed.
    if (existing?.amount != null) {
      depositAmount = Number(existing.amount);
      recipientEmail = recipientEmail ?? existing.customer_email ?? null;
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({
          error: quote_id
            ? "Customer email not found on quote request"
            : "Client has no email on file — assign a client with an email to invoice",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!(depositAmount > 0)) {
      return new Response(
        JSON.stringify({ error: "Deposit amount must be greater than zero" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestInfo = { email: recipientEmail, job_type: jobTypeLabel };
    const idempotencyRoot = quote_id ? `dep-${quote_id}` : `dep-job-${job_id}`;
    const depositAmountCents = Math.round(depositAmount * 100);
    const shortId = (quote_id ?? job_id!).slice(0, 8).toUpperCase();

    // Step 1: Create invoice in Square (DRAFT state)
    const createBody = {
      idempotency_key: idempotencyRoot,
      invoice: {
        location_id: SQUARE_LOCATION_ID,
        primary_recipient: {
          email_address: requestInfo.email,
        },
        payment_requests: [
          {
            request_type: "BALANCE",
            due_date: futureDateStr(3),
            automatic_payment_source: "NONE",
            reminders: [],
          },
        ],
        delivery_method: "EMAIL",
        invoice_number: `SAI-DEP-${shortId}`,
        title: "Sentinel Aerial Inspections — Deposit Invoice",
        description: `50% deposit for ${requestInfo.job_type ?? "aerial services"} — Job ${shortId}`,
        line_items: [
          {
            name: `Deposit (50%) — ${requestInfo.job_type ?? "Aerial Services"}`,
            quantity: "1",
            base_price_money: {
              amount: depositAmountCents,
              currency: "USD",
            },
          },
        ],
      },
    };

    const createResp = await fetch(`${SQUARE_BASE}/v2/invoices`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_API_VERSION,
      },
      body: JSON.stringify(createBody),
    });

    if (!createResp.ok) {
      const errBody = await createResp.json();
      console.error("Square create invoice failed:", errBody);
      return new Response(
        JSON.stringify({ error: "Square invoice creation failed", details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createData = await createResp.json();
    const squareInvoice = createData.invoice;

    // Step 2: Publish invoice — triggers Square to email the customer
    const publishResp = await fetch(
      `${SQUARE_BASE}/v2/invoices/${squareInvoice.id}/publish`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SQUARE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "Square-Version": SQUARE_API_VERSION,
        },
        body: JSON.stringify({
          idempotency_key: `pub-${idempotencyRoot}`,
          version: squareInvoice.version,
        }),
      }
    );

    if (!publishResp.ok) {
      const errBody = await publishResp.json();
      console.error("Square publish invoice failed:", errBody);
      // Invoice was created but not published — log and return error
      // The square_invoice_id is not stored yet; admin can retry
      return new Response(
        JSON.stringify({ error: "Square invoice publish failed", square_invoice_id: squareInvoice.id, details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const publishData = await publishResp.json();
    const publishedInvoice = publishData.invoice;

    // Step 3: record the Square invoice against a payments row.
    // Adopt the trigger-created row when there is one, otherwise insert.
    let paymentId: string | null = existing?.id ?? null;
    let insertError: { message: string } | null = null;

    if (paymentId) {
      const { error } = await supabase
        .from("payments")
        .update({
          square_invoice_id: publishedInvoice.id,
          square_invoice_url: publishedInvoice.public_url ?? null,
          job_id: job_id ?? undefined,
        })
        .eq("id", paymentId);
      insertError = error;
    } else {
      const { data: payment, error } = await supabase
        .from("payments")
        .insert({
          quote_id: quote_id,
          job_id: job_id,
          payment_type: "deposit",
          status: "pending",
          amount: depositAmount,
          square_invoice_id: publishedInvoice.id,
          square_invoice_url: publishedInvoice.public_url ?? null,
          customer_email: requestInfo.email,
        })
        .select("id")
        .single();
      insertError = error;
      paymentId = payment?.id ?? null;
    }

    if (insertError) {
      console.error("Supabase write failed after Square invoice published:", insertError);
      // Critical: Square invoice is live but Supabase record failed
      // Log the Square invoice ID for manual reconciliation
      console.error(
        "RECONCILIATION NEEDED: Square invoice", publishedInvoice.id,
        "for quote", quote_id, "job", job_id
      );
      return new Response(
        JSON.stringify({
          error: "Payment record write failed",
          square_invoice_id: publishedInvoice.id,
          square_invoice_url: publishedInvoice.public_url,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payment = { id: paymentId! };

    console.log(`Deposit invoice created: payment=${payment.id}, square=${publishedInvoice.id}, quote=${quote_id}, job=${job_id}`);

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
