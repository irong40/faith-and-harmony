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
    const { quote_id } = body as { quote_id: string };

    if (!quote_id) {
      return new Response(
        JSON.stringify({ error: "quote_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency guard: check for existing deposit payment
    const { data: existing, error: existingError } = await supabase
      .from("payments")
      .select("id, square_invoice_id, status")
      .eq("quote_id", quote_id)
      .eq("payment_type", "deposit")
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
          error: "Deposit invoice already exists for this quote",
          existing_payment_id: existing.id,
          existing_square_invoice_id: existing.square_invoice_id,
          status: existing.status,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (!requestInfo?.email) {
      return new Response(
        JSON.stringify({ error: "Customer email not found on quote request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const depositAmountCents = Math.round(Number(quote.deposit_amount) * 100);
    const shortId = quote_id.slice(0, 8).toUpperCase();

    // Step 1: Create invoice in Square (DRAFT state)
    const createBody = {
      idempotency_key: `dep-${quote_id}`,
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
          idempotency_key: `pub-dep-${quote_id}`,
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

    // Step 3: Insert payments row in Supabase
    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert({
        quote_id: quote_id,
        payment_type: "deposit",
        status: "pending",
        amount: Number(quote.deposit_amount),
        square_invoice_id: publishedInvoice.id,
        square_invoice_url: publishedInvoice.public_url ?? null,
        customer_email: requestInfo.email,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Supabase insert failed after Square invoice published:", insertError);
      // Critical: Square invoice is live but Supabase record failed
      // Log the Square invoice ID for manual reconciliation
      console.error("RECONCILIATION NEEDED: Square invoice", publishedInvoice.id, "for quote", quote_id);
      return new Response(
        JSON.stringify({
          error: "Payment record insert failed",
          square_invoice_id: publishedInvoice.id,
          square_invoice_url: publishedInvoice.public_url,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deposit invoice created: payment=${payment.id}, square=${publishedInvoice.id}, quote=${quote_id}`);

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
