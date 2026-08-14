/**
 * VAPI Tool Handler Edge Function
 *
 * Handles VAPI custom tool calls for the Paula AI assistants.
 * Currently supports:
 *   - lookup_customer: Look up existing client by phone number,
 *     return their active jobs, quotes, and status.
 *   - get_package_pricing: Return natural language pricing and deliverables
 *     for a given service_type so the bot can speak the answer aloud.
 *     Sourced LIVE from drone_packages — see the note on that handler.
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
import {
  PACKAGE_SELECT_COLUMNS,
  type PackageRow as SharedPackageRow,
  resolvePackages,
} from "../_shared/package-resolver.ts";

/**
 * Package matching (and the LEGACY_KEY_TO_CODE map that used to live here)
 * moved to ../_shared/package-resolver.ts on 2026-08-14.
 *
 * Reason: intake-lead resolved the SAME service_type string against
 * drone_packages using different columns (category/code vs code/service_type/
 * name). Only `code` overlapped, so a caller quoted correctly on the phone
 * could have a different package bound to their job seconds later. Sharing one
 * resolver is the fix; keeping a second copy here would recreate the defect.
 */

type PackageRow = SharedPackageRow & {
  name: string;
  price: number;
};

/**
 * Just the slice of the client this file's pricing lookup needs.
 *
 * Deliberately NOT `ReturnType<typeof createClient>`: calling createClient with
 * no schema generic infers the schema as `never`, which is why every row access
 * in handleLookupCustomer below is a type error today. Declaring the shape we
 * actually use keeps this handler honest and lets the tests pass a plain object
 * instead of casting a fake client to `never`.
 */
type PackageReader = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        order(
          column: string,
          opts: { ascending: boolean },
        ): PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
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
        // Narrowed at the boundary: structurally matching the real client
        // against PackageReader sends the checker into an unbounded generic
        // instantiation (TS2589). The cast is confined to this one line so the
        // handler itself keeps a type the tests can satisfy with a plain object.
        const result = await handleGetPackagePricing(
          supabase as unknown as PackageReader,
          args,
        );
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

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen",
  "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function under100(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

function under1000(n: number): string {
  if (n < 100) return under100(n);
  const h = `${ONES[Math.floor(n / 100)]} hundred`;
  const rest = n % 100;
  return rest ? `${h} ${under100(rest)}` : h;
}

/**
 * Spell a whole-dollar price for speech.
 *
 * There is no lookup table here on purpose. The previous version mapped five
 * literal prices to words and fell back to the BARE NUMERAL for anything else,
 * so the moment a price changed in the catalogue Paula would read "1350" as a
 * digit string down the phone. Prices now come from the database, so this has
 * to spell any of them.
 *
 * Four-figure prices that land on a round hundred are spoken the way people
 * actually say them — 1200 is "twelve hundred", not "one thousand two hundred".
 */
export function formatPriceAsWords(price: number, unit?: string): string {
  const n = Math.round(price);
  let words: string;
  if (n === 0) {
    words = "zero";
  } else if (n >= 1100 && n <= 9999 && n % 100 === 0) {
    words = `${under100(n / 100)} hundred`;
  } else if (n >= 1000) {
    const rest = n % 1000;
    words = `${under1000(Math.floor(n / 1000))} thousand${rest ? ` ${under1000(rest)}` : ""}`;
  } else {
    words = under1000(n);
  }
  const base = `${words} dollars`;
  if (!unit) return base;
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

/** Join for speech with an Oxford-style "and" before the last item. */
function speakList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** One package, spoken. Price 0 means quote-based — never say "zero dollars". */
function speakPackage(pkg: PackageRow): string {
  const features = pkg.features ?? [];
  const includes = features.length ? ` Includes ${speakList(features)}.` : "";
  if (!pkg.price || pkg.price <= 0) {
    return `${pkg.name} is priced per property rather than as a flat package, so Adam puts together a custom quote once he knows the site.${includes}`;
  }
  return `${pkg.name}: ${formatPriceAsWords(pkg.price)}.${includes}`;
}

/**
 * get_package_pricing — reads the LIVE catalogue.
 *
 * This used to answer from a hardcoded table written in March. By 2026-07-28 it
 * had drifted from drone_packages in a way that put wrong numbers in a caller's
 * ear: it quoted "Inspection Data, twelve hundred dollars" for work the live
 * catalogue prices at 0, i.e. quote-based. Every co-located test passed the
 * whole time, because the tests asserted the hardcoded table against itself.
 *
 * Rules this encodes:
 *   - active = false rows are never quoted (the retired 495/795/800/1250 tier).
 *   - price 0 is quote-based and must not be spoken as a number.
 *   - a service_type matching several packages lists them all, cheapest first.
 *   - if the query fails, say so and hand off. NEVER fall back to a literal.
 */
export async function handleGetPackagePricing(
  supabase: PackageReader,
  args: { service_type?: string }
): Promise<string> {
  const asked = args.service_type?.trim();

  if (!asked) {
    return "I need to know which service you are asking about. Could you tell me the package name?";
  }

  const { data, error } = await supabase
    .from("drone_packages")
    .select(PACKAGE_SELECT_COLUMNS)
    .eq("active", true)
    .order("price", { ascending: true });

  if (error || !data) {
    console.error("get_package_pricing: drone_packages query failed", error);
    return "I can't pull up the current pricing this second. Let me take your details and have Adam call you back with exact numbers.";
  }

  const rows = (data as unknown as PackageRow[]).map((r) => ({ ...r, price: Number(r.price) }));

  // Shared with intake-lead. Order: code -> service_type -> category -> name.
  const { matches } = resolvePackages(rows, asked);

  if (!matches.length) {
    const names = rows.map((r) => r.name);
    return names.length
      ? `I do not have pricing for that specific service. Our packages include ${speakList(names)}. Which one would you like to know about?`
      : "I do not have pricing for that specific service. Let me take your details and have Adam call you back.";
  }

  if (matches.length === 1) return speakPackage(matches[0]);

  return `We have a few options there. ${matches.map(speakPackage).join(" ")}`;
}
