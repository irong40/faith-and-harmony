// Core logic for the drone-delivery-email edge function.
//
// This module holds everything that is worth testing: stats aggregation, the
// HTML template, and the request handler. `index.ts` is a thin entry point that
// wires up the real Supabase/Resend clients and calls `serve`. Keeping the
// handler here means the tests can exercise it without starting an HTTP server.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sentinel Aerial Inspections Branding
export const BRAND = {
  navy: "#0f1e36",
  sky: "#3b82f6",
  accent: "#f59e0b",
  light: "#f0f4f8",
  companyName: "Sentinel Aerial Inspections",
  tagline: "Veteran-Owned Aerial Services — Hampton Roads, VA",
  email: "deliveries@sentinelaerialinspections.com",
  website: "sentinelaerialinspections.com",
  location: "Hampton Roads, Virginia",
};

export interface DeliveryEmailRequest {
  job_id: string;
  deliverable_ids?: string[];
  custom_message?: string;
  download_url?: string; // Drive folder URL from pipeline / admin
}

/** A row of `drone_deliverables` — what the Sortie desktop app actually writes. */
export interface DeliverableRow {
  id: string;
  name: string;
  description: string | null;
  download_url: string | null;
  file_count: number | null;
  total_size_bytes: number | null;
}

/** A row of `drone_assets` — written by the admin uploader, not by Sortie. */
export interface AssetRow {
  id: string;
  file_type: string | null;
  file_size: number | null;
}

/**
 * Aggregated numbers behind the stat tiles.
 *
 * `null` means UNKNOWN and must render as nothing at all. It never renders as
 * a zero. A tile reading "0MB" next to a 460MB Drive folder is worse than no
 * tile, so the distinction between "we know it is zero" and "we do not know"
 * is carried explicitly all the way to the template.
 */
export interface DeliveryStats {
  /** Which table the numbers came from. "none" means nothing is known. */
  source: "deliverables" | "assets" | "none";
  deliverableCount: number | null;
  fileCount: number | null;
  /** drone_deliverables carries no photo/video split, so these stay null there. */
  photoCount: number | null;
  videoCount: number | null;
  totalSizeBytes: number | null;
  /** Rounded MiB. Kept for the API response; the template uses the label. */
  totalSizeMB: number | null;
  /** Display string, or null when there is nothing honest to show. */
  totalSizeLabel: string | null;
}

const EMPTY_STATS: DeliveryStats = {
  source: "none",
  deliverableCount: null,
  fileCount: null,
  photoCount: null,
  videoCount: null,
  totalSizeBytes: null,
  totalSizeMB: null,
  totalSizeLabel: null,
};

/**
 * Sum a nullable numeric column. Returns null when EVERY row is null, which
 * means the producer never populated the column and the number is unknown.
 * Returns a number (possibly 0) when at least one row carried a value.
 */
function sumKnown<T>(rows: T[], pick: (row: T) => number | null | undefined): number | null {
  let total = 0;
  let sawValue = false;
  for (const row of rows) {
    const value = pick(row);
    if (typeof value === "number" && Number.isFinite(value)) {
      total += value;
      sawValue = true;
    }
  }
  return sawValue ? total : null;
}

/**
 * Format a byte count for display. Never returns "0MB":
 *  - unknown  -> null (render nothing)
 *  - exactly 0 -> null (nothing was delivered; a zero tile helps nobody)
 *  - under 1MiB -> "<1MB" so a small-but-real delivery is not rounded away
 */
export function formatSizeLabel(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes <= 0) return null;
  const mib = bytes / (1024 * 1024);
  if (mib < 1) return "<1MB";
  return `${Math.round(mib)}MB`;
}

/**
 * Build the stat tiles from whatever the producers populated.
 *
 * Precedence is explicit:
 *  1. `drone_deliverables` wins whenever it yields a known aggregate
 *     (file_count or total_size_bytes populated on at least one row). This is
 *     the Sortie path and the common case.
 *  2. Otherwise fall back to `drone_assets`, which the admin uploader writes.
 *     That path still gets the photo/video split.
 *  3. Otherwise nothing is known and NOTHING renders.
 *
 * Note step 1 deliberately requires a known aggregate rather than merely a
 * non-empty deliverables list. Deliverable rows with null counts carry no
 * numbers, so they must not shadow asset rows that do.
 *
 * `assets` defaults to null so callers can skip the asset query entirely on the
 * common path; pass an array only once you have actually fetched it.
 */
export function computeDeliveryStats(
  deliverables: DeliverableRow[],
  assets: AssetRow[] | null = null,
): DeliveryStats {
  const rows = deliverables ?? [];

  const fileCount = sumKnown(rows, (d) => d.file_count);
  const deliverableBytes = sumKnown(rows, (d) => d.total_size_bytes);

  if (rows.length > 0 && (fileCount !== null || deliverableBytes !== null)) {
    return {
      source: "deliverables",
      deliverableCount: rows.length,
      fileCount,
      photoCount: null, // drone_deliverables has no type split, and we do not invent one
      videoCount: null,
      totalSizeBytes: deliverableBytes,
      totalSizeMB: deliverableBytes === null ? null : Math.round(deliverableBytes / (1024 * 1024)),
      totalSizeLabel: formatSizeLabel(deliverableBytes),
    };
  }

  const assetRows = assets ?? [];
  if (assetRows.length > 0) {
    const assetBytes = sumKnown(assetRows, (a) => a.file_size);
    return {
      source: "assets",
      deliverableCount: rows.length > 0 ? rows.length : null,
      fileCount: assetRows.length,
      photoCount: assetRows.filter((a) => a.file_type?.startsWith("image/")).length,
      videoCount: assetRows.filter((a) => a.file_type?.startsWith("video/")).length,
      totalSizeBytes: assetBytes,
      totalSizeMB: assetBytes === null ? null : Math.round(assetBytes / (1024 * 1024)),
      totalSizeLabel: formatSizeLabel(assetBytes),
    };
  }

  return { ...EMPTY_STATS };
}

interface Tile {
  value: string;
  label: string;
}

/**
 * Render the stat tile row. Returns "" when nothing is known, so the caller can
 * inline it unconditionally. Only tiles with a known, non-zero value are built,
 * and corner rounding is applied by position so the row still looks right when
 * some tiles are missing.
 */
export function renderStatsHtml(stats: DeliveryStats): string {
  const tiles: Tile[] = [];

  if (stats.source === "deliverables") {
    if (stats.deliverableCount !== null && stats.deliverableCount > 0) {
      tiles.push({
        value: String(stats.deliverableCount),
        label: stats.deliverableCount === 1 ? "Deliverable" : "Deliverables",
      });
    }
    if (stats.fileCount !== null && stats.fileCount > 0) {
      tiles.push({ value: String(stats.fileCount), label: stats.fileCount === 1 ? "File" : "Files" });
    }
  } else if (stats.source === "assets") {
    if (stats.photoCount !== null && stats.photoCount > 0) {
      tiles.push({ value: String(stats.photoCount), label: "Photos" });
    }
    if (stats.videoCount !== null && stats.videoCount > 0) {
      tiles.push({ value: String(stats.videoCount), label: "Videos" });
    }
  }

  if (stats.totalSizeLabel) {
    tiles.push({ value: stats.totalSizeLabel, label: "Total" });
  }

  if (tiles.length === 0) return "";

  const cells = tiles.map((tile, i) => {
    const first = i === 0;
    const last = i === tiles.length - 1;
    const radius = first && last
      ? "8px"
      : first
      ? "8px 0 0 8px"
      : last
      ? "0 8px 8px 0"
      : "0";
    const leftBorder = first ? "" : " border-left: none;";
    return `
            <td style="text-align: center; padding: 16px; background-color: ${BRAND.light}; border-radius: ${radius}; border: 1px solid #dde3ea;${leftBorder}">
              <div style="font-size: 28px; font-weight: 700; color: ${BRAND.navy};">${tile.value}</div>
              <div style="font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">${tile.label}</div>
            </td>`;
  }).join("");

  return `
        <!-- Stats Row -->
        <table style="width: 100%; margin: 0 0 28px 0; border-collapse: collapse;">
          <tr>${cells}
          </tr>
        </table>
        `;
}

export interface BuildEmailArgs {
  emailSubject: string;
  siteLabel: string;
  jobTypeLabel: string;
  clientFirstName: string;
  custom_message?: string;
  primaryUrl?: string | null;
  deliverables: DeliverableRow[];
  stats: DeliveryStats;
  year?: number;
}

export function buildEmailHtml(args: BuildEmailArgs): string {
  const {
    emailSubject,
    siteLabel,
    jobTypeLabel,
    clientFirstName,
    custom_message,
    primaryUrl,
    deliverables,
    stats,
  } = args;
  const year = args.year ?? new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #eef2f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; margin-top: 24px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.navy} 0%, #1a3152 100%); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">
          ${BRAND.companyName}
        </h1>
        <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0 0; font-size: 12px; letter-spacing: 0.5px;">
          ${BRAND.tagline}
        </p>
      </td>
    </tr>

    <!-- Title Banner -->
    <tr>
      <td style="background: linear-gradient(135deg, ${BRAND.sky} 0%, #2563eb 100%); padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 20px; font-weight: 700;">Your Deliverables Are Ready</h2>
        <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px;">${siteLabel}</p>
      </td>
    </tr>

    <!-- Content -->
    <tr>
      <td style="padding: 32px;">
        <p style="color: #1a1a1a; line-height: 1.6; margin: 0 0 16px 0; font-size: 15px;">
          Hi ${clientFirstName},
        </p>
        <p style="color: #333; line-height: 1.6; margin: 0 0 24px 0; font-size: 15px;">
          Your <strong>${jobTypeLabel}</strong> deliverables for <strong>${siteLabel}</strong> are ready for review.
          You can access everything through the Google Drive link below.
        </p>
${renderStatsHtml(stats)}
        ${custom_message ? `
        <!-- Personal Note -->
        <div style="background-color: #f0f6ff; border-left: 4px solid ${BRAND.sky}; padding: 16px; margin: 0 0 28px 0; border-radius: 0 8px 8px 0;">
          <p style="color: #333; margin: 0; line-height: 1.6; font-size: 14px;">${custom_message}</p>
        </div>
        ` : ""}

        ${primaryUrl ? `
        <!-- Primary CTA -->
        <div style="text-align: center; margin: 28px 0;">
          <a href="${primaryUrl}"
             style="background: linear-gradient(135deg, ${BRAND.sky} 0%, #2563eb 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 16px; letter-spacing: 0.3px;">
            View Your Deliverables
          </a>
          <p style="color: #888; font-size: 12px; margin: 12px 0 0 0;">
            Opens in Google Drive
          </p>
        </div>
        ` : ""}

        ${deliverables.length > 1 ? `
        <!-- Additional Deliverables -->
        <h3 style="color: ${BRAND.navy}; margin: 28px 0 12px 0; font-size: 15px; font-weight: 600;">Additional Downloads</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          ${deliverables.slice(1).map((d) => `
          <tr>
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
              <strong style="color: ${BRAND.navy}; font-size: 14px;">${d.name}</strong>
              ${d.description ? `<br><span style="color: #666; font-size: 13px;">${d.description}</span>` : ""}
            </td>
            ${d.download_url ? `
            <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: right; white-space: nowrap;">
              <a href="${d.download_url}" style="color: ${BRAND.sky}; font-weight: 600; text-decoration: none; font-size: 14px;">
                Download
              </a>
            </td>
            ` : "<td></td>"}
          </tr>
          `).join("")}
        </table>
        ` : ""}

        <!-- Support -->
        <div style="text-align: center; margin: 32px 0 0 0; padding: 24px; background-color: #f8f9fb; border-radius: 8px;">
          <p style="color: #555; line-height: 1.6; margin: 0; font-size: 14px;">
            Questions about your deliverables? Reply to this email and we'll be happy to help.
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: ${BRAND.navy}; padding: 24px; text-align: center;">
        <p style="color: white; font-size: 14px; font-weight: 600; margin: 0;">${BRAND.companyName}</p>
        <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 6px 0 0 0;">
          ${BRAND.location}
        </p>
        <p style="color: rgba(255,255,255,0.5); font-size: 12px; margin: 8px 0 0 0;">
          <a href="https://${BRAND.website}" style="color: rgba(255,255,255,0.7); text-decoration: none;">${BRAND.website}</a>
          &nbsp;|&nbsp;
          <a href="mailto:${BRAND.email}" style="color: rgba(255,255,255,0.7); text-decoration: none;">${BRAND.email}</a>
        </p>
        <p style="color: rgba(255,255,255,0.3); font-size: 11px; margin: 10px 0 0 0;">
          &copy; ${year} ${BRAND.companyName}. All rights reserved.
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
    `.trim();
}

// Structural types so tests can inject fakes. The real @supabase/supabase-js
// client and the real resend@2 client both satisfy these.
export interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  from(table: string): any;
}

export interface ResendLike {
  emails: {
    send(payload: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      // deno-lint-ignore no-explicit-any
    }): Promise<{ data?: any; error?: any }>;
  };
}

export interface DeliveryDeps {
  supabase: SupabaseLike;
  resend: ResendLike;
  /** Injectable for deterministic tests. */
  now?: () => Date;
  newToken?: () => string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handleDeliveryRequest(req: Request, deps: DeliveryDeps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { supabase, resend } = deps;
  const now = deps.now ?? (() => new Date());
  const newToken = deps.newToken ?? (() => crypto.randomUUID().replace(/-/g, ""));

  try {
    const { job_id, deliverable_ids, custom_message, download_url } =
      await req.json() as DeliveryEmailRequest;

    if (!job_id) {
      return json({ error: "job_id is required" }, 400);
    }

    // Fetch job with its client
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select(`
        *,
        clients(id, name, email, company, phone),
        drone_packages(name),
        processing_templates(path_code, display_name)
      `)
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return json({ error: "Job not found" }, 404);
    }

    // clients is the only party table; drone_jobs.customer_id is deprecated
    const recipient = job.clients;
    const recipientEmail = recipient?.email;

    if (!recipientEmail) {
      return json({ error: "No client email found for this job" }, 400);
    }

    // Fetch selected deliverables. This is the ONLY table the Sortie desktop app
    // populates, so it is both the "Additional Downloads" source and the source
    // of the stat tiles — one fetch, used twice.
    let deliverables: DeliverableRow[] = [];
    {
      const columns = "id, name, description, download_url, file_count, total_size_bytes";
      const query = supabase.from("drone_deliverables").select(columns).eq("job_id", job_id);
      const { data } = deliverable_ids && deliverable_ids.length > 0
        ? await query.in("id", deliverable_ids)
        : await query;
      deliverables = (data ?? []) as DeliverableRow[];
    }

    // Stats come from drone_deliverables. Only when that yields nothing usable
    // do we pay for the drone_assets scan — that table is written by the admin
    // uploader (AdminAssetUpload.tsx), never by Sortie.
    let stats = computeDeliveryStats(deliverables);
    if (stats.source === "none") {
      const { data: assets } = await supabase
        .from("drone_assets")
        .select("id, file_type, file_size")
        .eq("job_id", job_id)
        .limit(500);
      stats = computeDeliveryStats(deliverables, (assets ?? []) as AssetRow[]);
    }

    // Primary delivery URL: explicit param > delivery_drive_url > download_url > first deliverable
    const primaryUrl =
      download_url ||
      job.delivery_drive_url ||
      job.download_url ||
      deliverables[0]?.download_url;

    if (!primaryUrl && deliverables.length === 0) {
      return json({ error: "No delivery URL or deliverables found for this job" }, 400);
    }

    const siteLabel =
      job.site_address ||
      `${job.property_address}${job.property_city ? `, ${job.property_city}` : ""}${job.property_state ? `, ${job.property_state}` : ""}`;

    const jobTypeLabel =
      job.processing_templates?.display_name ||
      job.drone_packages?.name ||
      "Aerial Inspection";

    const clientFirstName = (recipient?.name ?? "Client").split(" ")[0];

    const emailSubject = `Your Deliverables from Sentinel Aerial Inspections — ${jobTypeLabel} at ${siteLabel}`;

    const emailHtml = buildEmailHtml({
      emailSubject,
      siteLabel,
      jobTypeLabel,
      clientFirstName,
      custom_message,
      primaryUrl,
      deliverables,
      stats,
      year: now().getFullYear(),
    });

    // resend@2 returns { data, error } and never throws — the error field
    // MUST be checked, or a failed send still marks the job delivered
    const { data: sendData, error: sendError } = await resend.emails.send({
      from: `Sentinel Aerial Inspections <${BRAND.email}>`,
      to: [recipientEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    if (sendError) {
      console.error("Resend send failed — job NOT marked delivered:", sendError);
      return json({
        error: "email send failed",
        details: sendError.message ?? sendError.name ?? String(sendError),
      }, 502);
    }

    console.log("Sentinel delivery email sent:", sendData);

    // Generate delivery token for client portal access
    const deliveryToken = newToken();
    const timestamp = now().toISOString();

    // Update drone_jobs with delivery info — all delivery_status fields written atomically with the email send
    const { error: updateError } = await supabase
      .from("drone_jobs")
      .update({
        status: "delivered",
        delivered_at: timestamp,
        delivery_notes: custom_message ?? null,
        delivery_token: deliveryToken,
        delivery_token_created_at: timestamp,
        delivery_status: "sent",
        delivery_sent_at: timestamp,
        delivery_email_to: recipientEmail,
        ...(download_url ? { download_url } : {}),
      })
      .eq("id", job_id);

    if (updateError) {
      console.warn("delivery_status update failed after email send:", updateError);
    }

    return json({
      success: true,
      email_id: sendData?.id,
      sent_to: recipientEmail,
      stats: {
        source: stats.source,
        deliverable_count: stats.deliverableCount,
        file_count: stats.fileCount,
        photo_count: stats.photoCount,
        video_count: stats.videoCount,
        total_size_bytes: stats.totalSizeBytes,
        total_size_mb: stats.totalSizeMB,
        total_size_label: stats.totalSizeLabel,
      },
    });

  } catch (error) {
    console.error("Delivery email error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
}
