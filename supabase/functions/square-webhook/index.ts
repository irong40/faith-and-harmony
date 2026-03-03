import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SQUARE_WEBHOOK_SIGNATURE_KEY = Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY")!;

// Webhook URL must match exactly what you registered in Square Dashboard
// Square signs: URL + raw body
const WEBHOOK_URL = Deno.env.get("SQUARE_WEBHOOK_URL") ??
  `${SUPABASE_URL}/functions/v1/square-webhook`;

// Validate Square HMAC-SHA256 webhook signature
// Square computes: HMAC-SHA256(key, webhookUrl + rawBody) then base64-encodes
async function validateSquareSignature(
  signatureHeader: string | null,
  rawBody: string
): Promise<boolean> {
  if (!signatureHeader || !SQUARE_WEBHOOK_SIGNATURE_KEY) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SQUARE_WEBHOOK_SIGNATURE_KEY);
    const messageData = encoder.encode(WEBHOOK_URL + rawBody);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const computedSignature = btoa(
      String.fromCharCode(...new Uint8Array(signatureBuffer))
    );

    // Timing-safe comparison
    if (computedSignature.length !== signatureHeader.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      mismatch |= computedSignature.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
    }
    return mismatch === 0;
  } catch (err) {
    console.error("Signature validation error:", err);
    return false;
  }
}

serve(async (req) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  // Read raw body FIRST (needed for HMAC before JSON.parse)
  const rawBody = await req.text();
  const signatureHeader = req.headers.get("X-Square-Hmacsha256-Signature");

  // Validate HMAC signature
  const isValid = await validateSquareSignature(signatureHeader, rawBody);
  if (!isValid) {
    console.warn("Square webhook: invalid signature");
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const eventType = event.type as string;
  const eventId = event.event_id as string;

  console.log(`Square webhook received: type=${eventType}, event_id=${eventId}`);

  // Only process invoice.payment_made -- acknowledge all others
  if (eventType !== "invoice.payment_made") {
    return new Response(
      JSON.stringify({ received: true, processed: false, reason: "event type not handled" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Extract Square invoice ID from event
  const data = event.data as Record<string, unknown>;
  const squareInvoiceId = data?.id as string | undefined;

  if (!squareInvoiceId) {
    console.error("invoice.payment_made event missing data.id");
    return new Response(
      JSON.stringify({ error: "Missing invoice ID in event data" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Extract payment ID from the event (may be nested)
  let squarePaymentId: string | null = null;
  try {
    const invoiceObj = (data?.object as Record<string, unknown>)?.invoice as Record<string, unknown>;
    const paymentRequests = invoiceObj?.payment_requests as Array<Record<string, unknown>>;
    if (paymentRequests?.[0]?.tenders) {
      const tenders = paymentRequests[0].tenders as Array<Record<string, unknown>>;
      squarePaymentId = (tenders[0]?.payment_id as string) ?? null;
    }
  } catch {
    // squarePaymentId stays null -- not critical
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find the matching payment row by Square invoice ID
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("id, quote_id, status, payment_type, customer_email")
    .eq("square_invoice_id", squareInvoiceId)
    .maybeSingle();

  if (fetchError) {
    console.error("DB error looking up payment:", fetchError);
    return new Response(
      JSON.stringify({ error: "DB lookup failed" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!payment) {
    console.warn(`No payment found for square_invoice_id=${squareInvoiceId}`);
    return new Response(
      JSON.stringify({ received: true, processed: false, reason: "no matching payment" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Idempotency: skip if already paid
  if (payment.status === "paid") {
    console.log(`Payment ${payment.id} already marked paid -- skipping`);
    return new Response(
      JSON.stringify({ received: true, processed: false, reason: "already paid" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Mark payment as paid
  const { error: updateError } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      square_payment_id: squarePaymentId,
    })
    .eq("id", payment.id);

  if (updateError) {
    console.error("DB error updating payment to paid:", updateError);
    return new Response(
      JSON.stringify({ error: "Failed to record payment" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log(`Payment ${payment.id} (${payment.payment_type}) marked paid. quote=${payment.quote_id}`);

  // TODO (Plan 04): Trigger receipt email when BOTH deposit and balance are paid
  // if (payment.payment_type === 'balance') { ... trigger payment-receipt-email ... }

  return new Response(
    JSON.stringify({
      received: true,
      processed: true,
      payment_id: payment.id,
      payment_type: payment.payment_type,
      new_status: "paid",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
