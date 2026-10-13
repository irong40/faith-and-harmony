// Review email for an inspection run, plus the Resend sender.
//
// Style copied from send-substack-review-email (template.ts / resend.ts on the
// unmerged feat/substack-approval-workflow branch). Copied, not imported.
//
// Link-scanning risk: a corporate link scanner or security product could
// "click" a link in this email before Adam does. Gmail does not prefetch links.
// Each link is single-use (the database closes the run on the first decision)
// and bound to one run by its token hash, so a scanner click can at worst record
// one decision on that one run; it cannot reach any other run.

export const REVIEW_EMAIL = "dradamopierce@gmail.com";
// The address notification-email already sends from (verified Resend domain).
export const FROM_EMAIL = "Faith & Harmony <info@faithandharmonyllc.com>";

// Va. Code § 54.1-402(C) note. Must equal Sortie's
// sortie/services/reports/generator.py STATUTORY_PHOTOGRAMMETRY_NOTE byte for
// byte (Deno cannot import the Python constant; handler.spec.ts checks it).
export const STATUTORY_PHOTOGRAMMETRY_NOTE =
  "Any determination of topography or contours, or any depiction of physical improvements, property lines or boundaries is for general information only and shall not be used for the design, modification, or construction of improvements to real property or for flood plain determination.";

export type OutputFile = Readonly<{ path?: unknown; sha256?: unknown }>;

export type ReviewRun = Readonly<{
  id: string;
  run_key: string;
  profile: string;
  status: string;
  expected_detections: number;
  documented_extent_m2: number | string;
  created_at: string;
  code_version: string;
  e3_summary: Record<string, unknown> | null;
  outputs: { files?: Record<string, OutputFile> } | null;
  review_token_hash: string | null;
  review_token_expires_at: string | null;
}>;

export type EmailPayload = Readonly<{
  to: string;
  subject: string;
  html: string;
  text: string;
}>;

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function decisionUrl(
  supabaseUrl: string,
  rawToken: string,
  decision: "approve" | "reject",
): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/functions/v1/inspection-review?token=${
    encodeURIComponent(rawToken)
  }&decision=${decision}`;
}

// "2026-10-20 15:00 UTC": unambiguous in any reader's time zone.
export function formatUtc(iso: string | null): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function fileName(path: unknown): string {
  const text = String(path ?? "");
  const parts = text.split(/[\\/]/);
  return parts[parts.length - 1] || text;
}

function outputRows(run: ReviewRun): { name: string; sha256: string }[] {
  const files = run.outputs?.files ?? {};
  return Object.entries(files).map(([kind, file]) => ({
    name: file && file.path ? fileName(file.path) : kind,
    sha256: String(file?.sha256 ?? ""),
  }));
}

function outliers(run: ReviewRun): string {
  const value = run.e3_summary?.outliers;
  return typeof value === "number" ? String(value) : "n/a (no E3 for this run)";
}

function shell(content: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f2f7;color:#24152b;font-family:Arial,sans-serif;">
    <main style="max-width:720px;margin:0 auto;padding:32px 20px;">
      <section style="background:#ffffff;border:1px solid #e4dce8;border-radius:12px;padding:28px;">
        ${content}
      </section>
    </main>
  </body>
</html>`;
}

export function buildReviewEmail(
  run: ReviewRun,
  rawToken: string,
  supabaseUrl: string,
): EmailPayload {
  const approveUrl = decisionUrl(supabaseUrl, rawToken, "approve");
  const rejectUrl = decisionUrl(supabaseUrl, rawToken, "reject");
  const expires = formatUtc(run.review_token_expires_at);
  const files = outputRows(run);

  const summary: [string, string][] = [
    ["Profile", run.profile],
    ["Run key", run.run_key],
    ["Detections", String(run.expected_detections)],
    ["Outliers (E3)", outliers(run)],
    ["Documented extent", `${run.documented_extent_m2} m²`],
    ["Created", formatUtc(run.created_at)],
    ["Code version", run.code_version],
  ];

  const summaryHtml = summary.map(([label, value]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6d5a73;">${
      escapeHtml(label)
    }</td><td style="padding:4px 0;">${escapeHtml(value)}</td></tr>`
  ).join("");
  const filesHtml = files.length
    ? files.map((f) =>
      `<tr><td style="padding:4px 12px 4px 0;">${
        escapeHtml(f.name)
      }</td><td style="padding:4px 0;font-family:monospace;font-size:12px;word-break:break-all;">${
        escapeHtml(f.sha256)
      }</td></tr>`
    ).join("")
    : `<tr><td colspan="2" style="padding:4px 0;">No E4 files recorded.</td></tr>`;

  const onceLine = `Each link works once and expires ${expires}.`;

  return {
    to: REVIEW_EMAIL,
    subject: `Inspection run ready for review: ${run.profile} ${run.run_key}`,
    html: shell(`
      <p style="margin:0 0 8px;color:#6d5a73;font-size:13px;">Inspection review</p>
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.3;">${
      escapeHtml(run.profile)
    } run ready for review</h1>
      <table style="border-collapse:collapse;font-size:14px;margin:0 0 20px;">${summaryHtml}</table>
      <h2 style="font-size:16px;margin:0 0 8px;">E4 files (sha256)</h2>
      <table style="border-collapse:collapse;font-size:14px;margin:0 0 20px;">${filesHtml}</table>
      <p style="background:#fff7df;border:1px solid #e4c66a;border-radius:8px;padding:14px;font-size:13px;"><b>Va. Code &#167; 54.1-402(C) notice.</b> ${
      escapeHtml(STATUTORY_PHOTOGRAMMETRY_NOTE)
    }</p>
      <p style="margin:24px 0 8px;">
        <a href="${
      escapeHtml(approveUrl)
    }" style="display:inline-block;background:#5b2c6f;color:#ffffff;padding:12px 18px;border-radius:7px;text-decoration:none;font-weight:700;">Approve</a>
        <a href="${
      escapeHtml(rejectUrl)
    }" style="display:inline-block;margin-left:8px;border:1px solid #5b2c6f;color:#5b2c6f;padding:11px 18px;border-radius:7px;text-decoration:none;font-weight:700;">Reject</a>
      </p>
      <p style="margin:8px 0 0;color:#6d5a73;font-size:13px;">${
      escapeHtml(onceLine)
    }</p>
    `),
    text: [
      `Inspection run ready for review: ${run.profile} ${run.run_key}`,
      "",
      ...summary.map(([label, value]) => `${label}: ${value}`),
      "",
      "E4 files (sha256):",
      ...(files.length
        ? files.map((f) => `  ${f.name}  ${f.sha256}`)
        : ["  No E4 files recorded."]),
      "",
      `Va. Code § 54.1-402(C) notice. ${STATUTORY_PHOTOGRAMMETRY_NOTE}`,
      "",
      `Approve: ${approveUrl}`,
      `Reject: ${rejectUrl}`,
      "",
      onceLine,
    ].join("\n"),
  };
}

// ─── Resend (copied from send-substack-review-email/resend.ts) ───────────

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type ResendConfig = Readonly<{
  apiKey: string;
  from: string;
}>;

export async function sendWithResend(
  fetcher: FetchLike,
  config: ResendConfig,
  payload: EmailPayload,
): Promise<{ id: string } | null> {
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) return null;
  const body = await response.json() as { id?: unknown };
  return typeof body.id === "string" && body.id ? { id: body.id } : null;
}
