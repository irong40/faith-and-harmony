// inspection-review: pure request handling with injected dependencies.
//
// Two jobs (Adam 2026-10-13: signed link, edge function only):
//   POST {action:"send", run_id, token}  service-key call from Sortie's
//        open_review(); emails Adam the review link for a run that is
//        awaiting_review and whose stored review_token_hash is sha256(token).
//   GET  ?token=...&decision=approve|reject  the link in that email; records
//        Adam's decision. The token itself is the credential.
//
// The database owns the gate (inspection_runs_guard): approval needs a
// reviewer, a closed run cannot change, and the token columns freeze with the
// decision. This handler only refuses early and reports the database's answer.
//
// GET responses are text/plain on purpose: Supabase rewrites text/html on GET
// responses from edge functions to text/plain anyway.

import { buildReviewEmail, type EmailPayload, type ReviewRun } from "./email.ts";

export const REVIEWED_BY = "dradamopierce@gmail.com (signed link)";

export type DecisionResult =
  | { kind: "ok" }
  | { kind: "stale" } // optimistic .eq('status','awaiting_review') matched no row
  | { kind: "refused"; message: string }; // database guard raised

export type InspectionReviewDependencies = Readonly<{
  serviceRoleKey: string;
  secretKeys?: readonly string[];
  functionsBaseUrl: string; // SUPABASE_URL; links are built under /functions/v1
  now: () => Date;
  loadRunById: (id: string) => Promise<ReviewRun | null>;
  loadRunByTokenHash: (hash: string) => Promise<ReviewRun | null>;
  sendEmail: (payload: EmailPayload) => Promise<{ id: string } | null>;
  markEmailSent: (input: { id: string; sentAt: string }) => Promise<void>;
  decide: (
    input: { id: string; status: "approved" | "rejected"; reviewedBy: string },
  ) => Promise<DecisionResult>;
  logError: (message: string) => void;
  // Injectable so the spec can prove every secret comparison goes through it.
  secureEqual?: (left: string, right: string) => boolean;
}>;

// Constant-time string compare: runtime depends only on the longer length.
export function secureEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
}

// Same digest as Python's hashlib.sha256(token.encode()).hexdigest(), which
// Sortie stores in review_token_hash.
export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Only the server runtime's registered secret keys are trusted. Never infer
// service authority from a caller-supplied JWT payload or a key's prefix alone.
// (Same rule as send-substack-review-email.)
export function parseRuntimeSecretKeys(value: string): string[] {
  try {
    const keys: unknown = JSON.parse(value);
    if (!keys || typeof keys !== "object" || Array.isArray(keys)) return [];
    return Object.values(keys).filter((key): key is string =>
      typeof key === "string" && key.startsWith("sb_secret_") &&
      key.length > "sb_secret_".length && key.trim() === key
    );
  } catch {
    return [];
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function text(body: string, status = 200): Response {
  return new Response(`${body}\n`, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function isExpired(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return true;
  const at = new Date(expiresAt).getTime();
  return Number.isNaN(at) || at <= now.getTime();
}

function authorized(
  request: Request,
  deps: InspectionReviewDependencies,
  equal: (left: string, right: string) => boolean,
): boolean {
  const actualAuthorization = request.headers.get("Authorization") ?? "";
  const legacyAuthorized = Boolean(deps.serviceRoleKey) &&
    equal(actualAuthorization, `Bearer ${deps.serviceRoleKey}`);
  const apiKey = request.headers.get("apikey") ?? "";
  const secretAuthorized = (deps.secretKeys ?? []).some((key) =>
    key.startsWith("sb_secret_") && key.length > "sb_secret_".length &&
    equal(apiKey, key)
  );
  return legacyAuthorized || secretAuthorized;
}

async function handleSend(
  request: Request,
  deps: InspectionReviewDependencies,
  equal: (left: string, right: string) => boolean,
): Promise<Response> {
  if (!authorized(request, deps, equal)) {
    return json({ error: "Invalid service authentication" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Invalid request" }, 400);
  }
  const fields = body as Record<string, unknown>;
  if (fields.action !== "send") {
    return json({ error: `Unsupported action: ${String(fields.action)}` }, 400);
  }
  if (typeof fields.run_id !== "string" || !fields.run_id.trim()) {
    return json({ error: "run_id is required" }, 400);
  }
  if (typeof fields.token !== "string" || !fields.token) {
    return json({ error: "token is required" }, 400);
  }
  const token = fields.token;

  const run = await deps.loadRunById(fields.run_id);
  if (!run) return json({ error: "Inspection run not found" }, 404);
  if (run.status !== "awaiting_review") {
    return json(
      { error: `Inspection run is ${run.status}, not awaiting_review` },
      409,
    );
  }
  const supplied = await sha256Hex(token);
  if (!run.review_token_hash || !equal(supplied, run.review_token_hash)) {
    return json({ error: "Review token does not match this run" }, 403);
  }
  if (isExpired(run.review_token_expires_at, deps.now())) {
    return json({ error: "Review token has expired; rotate it and resend" }, 410);
  }

  const email = buildReviewEmail(run, token, deps.functionsBaseUrl);
  const result = await deps.sendEmail(email);
  if (!result) {
    deps.logError(`Resend rejected the review email for run ${run.id}`);
    return json({ error: "Email provider rejected the message" }, 502);
  }
  await deps.markEmailSent({ id: run.id, sentAt: deps.now().toISOString() });
  return json({ email_id: result.id });
}

async function handleDecision(
  request: Request,
  deps: InspectionReviewDependencies,
  equal: (left: string, right: string) => boolean,
): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const decision = params.get("decision");
  if (decision !== "approve" && decision !== "reject") {
    return text("Unknown decision. Use the Approve or Reject link from the email.", 400);
  }
  const token = params.get("token") ?? "";
  if (!token) return text("Review link not found.", 404);

  const hash = await sha256Hex(token);
  const run = await deps.loadRunByTokenHash(hash);
  if (!run || !run.review_token_hash || !equal(hash, run.review_token_hash)) {
    return text("Review link not found.", 404);
  }

  const wanted = decision === "approve" ? "approved" : "rejected";
  if (run.status === "approved" || run.status === "rejected") {
    const same = run.status === wanted;
    return text(
      same
        ? `Inspection run ${run.run_key} is already ${run.status}. Nothing changed.`
        : `Inspection run ${run.run_key} was already ${run.status}; this link cannot change that.`,
      409,
    );
  }
  if (run.status !== "awaiting_review") {
    return text(
      `Inspection run ${run.run_key} is ${run.status}, not awaiting review. Nothing changed.`,
      409,
    );
  }
  if (isExpired(run.review_token_expires_at, deps.now())) {
    return text(
      `This review link expired. Ask Sortie to resend the review email for ${run.run_key}.`,
      410,
    );
  }

  const result = await deps.decide({
    id: run.id,
    status: wanted,
    reviewedBy: REVIEWED_BY,
  });
  if (result.kind === "refused") {
    deps.logError(`Database refused ${wanted} for run ${run.id}: ${result.message}`);
    return text(`The database refused this decision: ${result.message}`, 409);
  }
  if (result.kind === "stale") {
    return text(
      `Inspection run ${run.run_key} changed before this decision was recorded. Nothing changed.`,
      409,
    );
  }
  return text(`Inspection run ${run.run_key} ${wanted}. Recorded as ${REVIEWED_BY}.`);
}

export async function handleInspectionReview(
  request: Request,
  deps: InspectionReviewDependencies,
): Promise<Response> {
  const equal = deps.secureEqual ?? secureEqual;
  if (request.method === "POST") return await handleSend(request, deps, equal);
  if (request.method === "GET") return await handleDecision(request, deps, equal);
  return json({ error: "Method not allowed" }, 405);
}
