import { hashReviewToken } from "../substack-review/domain.ts";
import {
  buildPublishedEmail,
  buildReviewEmail,
  type EmailPayload,
  type ReviewEmailVersion,
} from "./template.ts";

type DeliveryMark = Readonly<{
  id: string;
  messageId: string;
  sentAt: string;
}>;

export type EmailDependencies = Readonly<{
  serviceRoleKey: string;
  reviewBaseUrl: string;
  now: () => Date;
  loadVersion: (id: string) => Promise<ReviewEmailVersion | null>;
  sendEmail: (payload: EmailPayload) => Promise<{ id: string } | null>;
  markReviewSent: (input: DeliveryMark) => Promise<void>;
  markPublicationSent: (input: DeliveryMark) => Promise<void>;
  logError: (message: string) => void;
}>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function secureEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return mismatch === 0;
}

function parseBody(value: unknown):
  | { action: "review"; versionId: string; token: string }
  | { action: "published"; versionId: string }
  | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.version_id !== "string" || body.version_id.trim() === "") {
    return null;
  }
  if (body.action === "review" && typeof body.token === "string" && body.token) {
    return { action: "review", versionId: body.version_id, token: body.token };
  }
  if (body.action === "published") {
    return { action: "published", versionId: body.version_id };
  }
  return null;
}

export async function handleSubstackReviewEmail(
  request: Request,
  deps: EmailDependencies,
): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expectedAuthorization = `Bearer ${deps.serviceRoleKey}`;
  const actualAuthorization = request.headers.get("Authorization") ?? "";
  if (!deps.serviceRoleKey || !secureEqual(actualAuthorization, expectedAuthorization)) {
    return json({ error: "Invalid service authentication" }, 401);
  }

  let untrustedBody: unknown;
  try {
    untrustedBody = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = parseBody(untrustedBody);
  if (!parsed) {
    const action = untrustedBody && typeof untrustedBody === "object"
      ? (untrustedBody as Record<string, unknown>).action
      : undefined;
    if (typeof action === "string" && !["review", "published"].includes(action)) {
      return json({ error: `Unsupported email action: ${action}` }, 400);
    }
    return json({ error: "Invalid email request" }, 400);
  }

  const stored = await deps.loadVersion(parsed.versionId);
  if (!stored) {
    deps.logError(`Substack email version not found: ${parsed.versionId}`);
    return json({ error: "Review version not found" }, 404);
  }

  let email: EmailPayload;
  let markSent: (input: DeliveryMark) => Promise<void>;

  if (parsed.action === "review") {
    if (stored.status !== "pending_review") {
      return json({ error: "This version is not awaiting review" }, 409);
    }
    const suppliedHash = await hashReviewToken(parsed.token);
    if (!secureEqual(suppliedHash, stored.token_hash)) {
      return json({ error: "Review token does not match the stored version" }, 409);
    }
    email = buildReviewEmail(stored, parsed.token, deps.reviewBaseUrl);
    markSent = deps.markReviewSent;
  } else {
    if (stored.status !== "published" || !stored.published_url) {
      return json({ error: "The live publication has not been verified" }, 409);
    }
    email = buildPublishedEmail(stored);
    markSent = deps.markPublicationSent;
  }

  const result = await deps.sendEmail(email);
  if (!result) {
    deps.logError(`Resend rejected Substack ${parsed.action} email for ${stored.id}`);
    return json({ error: "Email provider rejected the message" }, 502);
  }

  await markSent({
    id: stored.id,
    messageId: result.id,
    sentAt: deps.now().toISOString(),
  });

  return json({ success: true, message_id: result.id });
}
