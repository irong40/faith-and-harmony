/**
 * VAPI Tool Handler Edge Function
 *
 * Handles VAPI custom tool calls for the Paula AI assistants.
 * Currently supports:
 *   - lookup_customer: Look up existing client by phone number,
 *     return their active jobs, quotes, and status.
 *   - get_package_pricing: Return natural language pricing and deliverables
 *     for a given service_type so the bot can speak the answer aloud.
 *   - check_availability: Check available dates for scheduling via the
 *     availability-check edge function.
 *
 * VAPI sends tool-call requests as POST with:
 *   { message: { type: "tool-calls", toolCallList: [...] } }
 *
 * We respond with:
 *   { results: [{ toolCallId: "...", result: "..." }] }
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Package pricing data — canonical values from CLAUDE.md.
// Duplicated here rather than imported from pricing-lookup to avoid that module's
// top-level serve() call conflicting with this function's handler.
const PACKAGES: Record<string, { name: string; price: number; unit?: string; deliverables: string[] }> = {
  re_basic: {
    name: 'Listing Lite',
    price: 225,
    deliverables: ['10 photos', 'Sky replacement', 'Next day delivery'],
  },
  re_standard: {
    name: 'Listing Pro',
    price: 450,
    deliverables: ['25 photos', '60 second reel', '2D boundary overlay', '48 hour turnaround'],
  },
  re_premium: {
    name: 'Luxury Listing',
    price: 750,
    deliverables: ['40+ photos', '2 minute cinematic video', 'Twilight shoot', '24 hour priority'],
  },
  construction: {
    name: 'Construction Progress',
    price: 450,
    unit: '/visit',
    deliverables: ['Orthomosaic', 'Site overview', 'Date stamped archive'],
  },
  commercial: {
    name: 'Commercial Marketing',
    price: 850,
    deliverables: ['4K video', '3D model', 'Raw footage', 'Perpetual license'],
  },
  inspection: {
    name: 'Inspection Data',
    price: 1200,
    deliverables: ['Inspection grid photography', 'Annotated report', 'Exportable data'],
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const message = body.message;

    if (!message || message.type !== "tool-calls") {
      return jsonResponse({ error: "Expected tool-calls event" }, 400);
    }

    const toolCalls = message.toolCallList || [];
    const results: { toolCallId: string; result: string }[] = [];

    for (const toolCall of toolCalls) {
      const { id, name, arguments: args } = toolCall;

      if (name === "lookup_customer") {
        const result = await handleLookupCustomer(supabase, args);
        results.push({ toolCallId: id, result });
      } else if (name === "get_package_pricing") {
        const result = await handleGetPackagePricing(args);
        results.push({ toolCallId: id, result });
      } else if (name === "check_availability") {
        const result = await handleCheckAvailability(args);
        results.push({ toolCallId: id, result });
      } else {
        results.push({
          toolCallId: id,
          result: `Unknown function: ${name}`,
        });
      }
    }

    return jsonResponse({ results });
  } catch (err) {
    console.error("VAPI tool handler error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

async function handleLookupCustomer(
  supabase: ReturnType<typeof createClient>,
  args: { phone_number: string }
): Promise<string> {
  const phone = args.phone_number;
  if (!phone) return "No phone number provided.";

  const normalized = normalizePhone(phone);
  // Search with both normalized and raw formats
  const phoneLike = normalized.slice(-10); // last 10 digits

  // Look up client by phone (partial match on last 10 digits)
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, company")
    .or(`phone.ilike.%${phoneLike}`)
    .limit(1);

  if (!clients || clients.length === 0) {
    return "No existing customer found with that phone number. This appears to be a new caller.";
  }

  const client = clients[0];
  const clientId = client.id;

  // Fetch active drone jobs (uses client_id FK to clients table)
  const { data: jobs } = await supabase
    .from("drone_jobs")
    .select(
      "job_number, status, property_address, property_type, scheduled_date, delivered_at"
    )
    .eq("client_id", clientId)
    .not("status", "eq", "cancelled")
    .order("created_at", { ascending: false })
    .limit(5);

  // Fetch recent quote requests by phone match
  const { data: quoteRequests } = await supabase
    .from("quote_requests")
    .select("id, job_type, status, created_at")
    .or(`phone.ilike.%${phoneLike}`)
    .order("created_at", { ascending: false })
    .limit(5);

  // Build summary
  const lines: string[] = [];
  lines.push(
    `Customer: ${client.name}${client.company ? ` (${client.company})` : ""}`
  );
  lines.push(`Phone: ${client.phone || phone}`);
  if (client.email) lines.push(`Email: ${client.email}`);

  if (jobs && jobs.length > 0) {
    lines.push(`\nActive Jobs (${jobs.length}):`);
    for (const job of jobs) {
      const status = job.status.charAt(0).toUpperCase() + job.status.slice(1);
      lines.push(
        `- ${job.job_number}: ${status} — ${job.property_address || "address pending"}${job.scheduled_date ? `, scheduled ${job.scheduled_date}` : ""}${job.delivered_at ? ", DELIVERED" : ""}`
      );
    }
  } else {
    lines.push("\nNo active jobs.");
  }

  if (quoteRequests && quoteRequests.length > 0) {
    lines.push(`\nRecent Quote Requests (${quoteRequests.length}):`);
    for (const qr of quoteRequests) {
      const status = qr.status.charAt(0).toUpperCase() + qr.status.slice(1);
      lines.push(`- ${qr.job_type || "General"}: ${status}`);
    }
  }

  return lines.join("\n");
}

// Price words mapping for spoken responses. Known prices only.
// If price is not in the map, fall back to numeric string.
const PRICE_WORDS: Record<number, string> = {
  225: "two hundred twenty five",
  450: "four hundred fifty",
  750: "seven hundred fifty",
  850: "eight hundred fifty",
  1200: "twelve hundred",
};

export function formatPriceAsWords(price: number, unit?: string): string {
  const words = PRICE_WORDS[price] ?? String(price);
  const base = `${words} dollars`;
  if (!unit) return base;
  // unit arrives as "/visit" from the PACKAGES data; convert to spoken form
  const spoken = unit.replace(/^\//, "per ");
  return `${base} ${spoken}`;
}

async function handleCheckAvailability(
  args: { start_date?: string; end_date?: string; service_type?: string }
): Promise<string> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Default to next 14 days if no dates provided
  const today = new Date();
  const startDate = args.start_date || today.toISOString().slice(0, 10);
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 14);
  const endDate = args.end_date || futureDate.toISOString().slice(0, 10);

  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  if (args.service_type) params.set("service_type", args.service_type);

  const url = `${SUPABASE_URL}/functions/v1/availability-check?${params}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });

  if (!resp.ok) {
    return "I'm sorry, I wasn't able to check the schedule right now. Please call back or we can have someone reach out to you.";
  }

  const data = await resp.json();

  if (data.count === 0) {
    return `I don't see any open dates between ${startDate} and ${endDate}. Would you like me to check a different time range?`;
  }

  return `We have ${data.count} dates available: ${data.readable_dates}. Which date works best for you?`;
}

export async function handleGetPackagePricing(
  args: { service_type?: string }
): Promise<string> {
  const { service_type } = args;

  if (!service_type) {
    return "I need to know which service you are asking about. Could you tell me the package name?";
  }

  const pkg = PACKAGES[service_type];

  if (!pkg) {
    return "I do not have pricing for that specific service. Our packages include Listing Lite, Listing Pro, Luxury Listing, Construction Progress, Commercial Marketing, and Inspection Data. Which one would you like to know about?";
  }

  const priceSpoken = formatPriceAsWords(pkg.price, pkg.unit);

  // Build deliverables list with Oxford-style "and" before last item
  const deliverables = pkg.deliverables;
  let deliverablesList: string;
  if (deliverables.length === 1) {
    deliverablesList = deliverables[0];
  } else if (deliverables.length === 2) {
    deliverablesList = `${deliverables[0]} and ${deliverables[1]}`;
  } else {
    const allButLast = deliverables.slice(0, -1).join(", ");
    deliverablesList = `${allButLast}, and ${deliverables[deliverables.length - 1]}`;
  }

  return `${pkg.name}: ${priceSpoken}. Includes ${deliverablesList}.`;
}
