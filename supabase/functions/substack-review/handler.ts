import {
  APPROVED_REVIEW_EMAIL,
  getApprovalDisposition,
  hashReviewToken,
  isExpired,
  normalizeEmail,
  type ReviewStatus,
} from "./domain.ts";

export type ReviewVersion = Readonly<{
  id: string;
  draft_id: string;
  version: number;
  status: ReviewStatus;
  selected_headline: string;
  subtitle: string;
  article_markdown: string;
  notes_teaser: string;
  subscribe_call: string;
  content_hash: string;
  expires_at: string;
  requested_changes: string | null;
  published_url: string | null;
}>;

export type AuthenticatedReviewer = Readonly<{
  id: string;
  email: string;
}>;

export type ChangeRequestInput = Readonly<{
  id: string;
  expectedStatus: "pending_review";
  changes: string;
  requestedAt: string;
}>;

export type ApprovalInput = Readonly<{
  id: string;
  expectedStatus: "pending_review";
  version: number;
  contentHash: string;
  approvedAt: string;
  approvedBy: string;
}>;

export type ReviewEvent = Readonly<{
  versionId: string;
  eventType: "changes_requested" | "approved";
  actorType: "reviewer";
  actorIdentifier: string;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type ReviewDependencies = Readonly<{
  now: () => Date;
  authenticate: (request: Request) => Promise<AuthenticatedReviewer | null>;
  findVersionByTokenHash: (tokenHash: string) => Promise<ReviewVersion | null>;
  requestChanges: (input: ChangeRequestInput) => Promise<ReviewVersion | null>;
  approveVersion: (input: ApprovalInput) => Promise<ReviewVersion | null>;
  appendEvent: (event: ReviewEvent) => Promise<void>;
}>;

type ReviewAction =
  | { action: "load"; token: string }
  | { action: "request_changes"; token: string; changes: string }
  | {
    action: "approve";
    token: string;
    version: number;
    content_hash: string;
    confirm_publish: true;
  };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeReview(version: ReviewVersion) {
  return {
    id: version.id,
    draft_id: version.draft_id,
    version: version.version,
    status: version.status,
    selected_headline: version.selected_headline,
    subtitle: version.subtitle,
    article_markdown: version.article_markdown,
    notes_teaser: version.notes_teaser,
    subscribe_call: version.subscribe_call,
    content_hash: version.content_hash,
    expires_at: version.expires_at,
    requested_changes: version.requested_changes,
    published_url: version.published_url,
  };
}

function parseAction(body: unknown): ReviewAction | null {
  if (!body || typeof body !== "object") return null;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.token !== "string" || candidate.token.trim() === "") {
    return null;
  }

  if (candidate.action === "load") {
    return { action: "load", token: candidate.token };
  }

  if (candidate.action === "request_changes") {
    if (typeof candidate.changes !== "string") return null;
    return {
      action: "request_changes",
      token: candidate.token,
      changes: candidate.changes,
    };
  }

  if (candidate.action === "approve") {
    if (
      typeof candidate.version !== "number" ||
      !Number.isInteger(candidate.version) ||
      typeof candidate.content_hash !== "string" ||
      candidate.confirm_publish !== true
    ) {
      return null;
    }
    return {
      action: "approve",
      token: candidate.token,
      version: candidate.version,
      content_hash: candidate.content_hash,
      confirm_publish: true,
    };
  }

  return null;
}

function blockedStatusResponse(status: ReviewStatus): Response | null {
  if (status === "expired") {
    return json({ error: "This review link has expired" }, 410);
  }
  if (status === "superseded" || status === "changes_requested") {
    return json({ error: "This review version is no longer active" }, 409);
  }
  return null;
}

export async function handleSubstackReview(
  req: Request,
  deps: ReviewDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authorization = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return json({ error: "Authentication required" }, 401);
  }

  const reviewer = await deps.authenticate(req);
  if (!reviewer) {
    return json({ error: "Invalid authentication" }, 401);
  }

  const reviewerEmail = normalizeEmail(reviewer.email);
  if (reviewerEmail !== APPROVED_REVIEW_EMAIL) {
    return json({ error: "This Google account cannot review this draft" }, 403);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = parseAction(rawBody);
  if (!action) {
    const actionName = rawBody && typeof rawBody === "object"
      ? (rawBody as Record<string, unknown>).action
      : undefined;
    if (typeof actionName === "string" && ![
      "load",
      "request_changes",
      "approve",
    ].includes(actionName)) {
      return json({ error: `Unsupported review action: ${actionName}` }, 400);
    }
    return json({ error: "Invalid review request" }, 400);
  }

  const tokenHash = await hashReviewToken(action.token);
  const current = await deps.findVersionByTokenHash(tokenHash);
  if (!current) {
    return json({ error: "Review link not found" }, 404);
  }

  if (isExpired(current.expires_at, deps.now())) {
    return json({ error: "This review link has expired" }, 410);
  }

  const blocked = blockedStatusResponse(current.status);
  if (blocked) return blocked;

  if (action.action === "load") {
    return json({ review: safeReview(current) });
  }

  if (action.action === "request_changes") {
    const changes = action.changes.trim();
    if (changes === "") {
      return json({ error: "Change request text is required" }, 400);
    }
    if (current.status !== "pending_review") {
      return json({ error: "This version is not awaiting review" }, 409);
    }

    const updated = await deps.requestChanges({
      id: current.id,
      expectedStatus: "pending_review",
      changes,
      requestedAt: deps.now().toISOString(),
    });
    if (!updated) {
      return json({ error: "The review state changed before this request" }, 409);
    }

    await deps.appendEvent({
      versionId: current.id,
      eventType: "changes_requested",
      actorType: "reviewer",
      actorIdentifier: reviewerEmail,
      metadata: { version: current.version },
    });

    return json({ status: updated.status, review: safeReview(updated) });
  }

  const disposition = getApprovalDisposition(
    {
      status: current.status,
      version: current.version,
      contentHash: current.content_hash,
    },
    { version: action.version, contentHash: action.content_hash },
  );

  if (disposition === "conflict") {
    return json({ error: "The approved content snapshot is stale" }, 409);
  }
  if (disposition === "already_approved") {
    return json({ status: "approved", idempotent: true });
  }

  const updated = await deps.approveVersion({
    id: current.id,
    expectedStatus: "pending_review",
    version: action.version,
    contentHash: action.content_hash,
    approvedAt: deps.now().toISOString(),
    approvedBy: reviewer.id,
  });
  if (!updated) {
    return json({ error: "The review state changed before approval" }, 409);
  }

  await deps.appendEvent({
    versionId: current.id,
    eventType: "approved",
    actorType: "reviewer",
    actorIdentifier: reviewerEmail,
    metadata: {
      version: current.version,
      content_hash: current.content_hash,
    },
  });

  return json({ status: updated.status, idempotent: false });
}
