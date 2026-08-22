import { createHash, randomBytes } from "node:crypto";
import { readFile as readFileFromDisk } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import { packageSubstackDraft } from "./draft.mjs";

const REVIEW_EMAIL = "dradamopierce@gmail.com";
const REVIEW_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function tokenHash(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function one(data) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error?.message === "string") return error.message;
  return String(error ?? "Unknown error");
}

function requireText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function resolveDependencies(deps = {}) {
  const supabase = deps.supabase ?? createSupabaseFromEnvironment();
  return {
    supabase,
    readFile: deps.readFile ?? readFileFromDisk,
    now: deps.now ?? (() => new Date()),
    createToken: deps.createToken ?? (() => randomBytes(32).toString("base64url")),
    reviewEmail: deps.reviewEmail ?? REVIEW_EMAIL,
    draftOptions: deps.draftOptions,
  };
}

async function rpcOne(supabase, name, args = undefined) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return one(data);
}

function safeVersion(version, extra = {}) {
  if (!version) return null;
  return {
    id: version.id,
    draft_id: version.draft_id,
    version: version.version,
    status: version.status,
    selected_headline: version.selected_headline,
    subtitle: version.subtitle,
    source_path: version.source_path,
    content_hash: version.content_hash,
    ...extra,
  };
}

async function sendReviewEmail(supabase, versionId, rawToken) {
  const { data, error } = await supabase.functions.invoke(
    "send-substack-review-email",
    { body: { action: "review", version_id: versionId, token: rawToken } },
  );
  if (error) throw error;
  if (!data?.success) throw new Error("Review email service did not confirm delivery");
  return data;
}

export function createSupabaseFromEnvironment(environment = process.env) {
  const url = requireText(environment.SUPABASE_URL, "SUPABASE_URL");
  const serviceRoleKey = requireText(
    environment.SUPABASE_SERVICE_ROLE_KEY,
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function enqueueDraft(filePath, dependencies = {}) {
  const deps = resolveDependencies(dependencies);
  const absolutePath = requireText(filePath, "Draft file path");
  const markdown = await deps.readFile(absolutePath, "utf8");
  const draft = packageSubstackDraft(markdown, absolutePath, deps.draftOptions);
  const rawToken = deps.createToken();
  const digest = tokenHash(rawToken);
  const expiresAt = new Date(deps.now().getTime() + REVIEW_LIFETIME_MS).toISOString();

  let version = await rpcOne(deps.supabase, "enqueue_substack_review_version", {
    input_draft_id: draft.draftId,
    input_selected_headline: draft.selectedHeadline,
    input_subtitle: draft.subtitle,
    input_article_markdown: draft.articleMarkdown,
    input_notes_teaser: draft.notesTeaser,
    input_subscribe_call: draft.subscribeCall,
    input_source_path: draft.sourcePath,
    input_content_hash: draft.contentHash,
    input_token_hash: digest,
    input_review_email: deps.reviewEmail,
    input_expires_at: expiresAt,
  });
  if (!version) throw new Error("The review queue did not create or return a version");

  const reused = Boolean(version.reused);
  if (reused && version.review_sent_at) {
    return safeVersion(version, { reused: true, review_email_sent: true });
  }

  if (reused) {
    version = await rpcOne(deps.supabase, "rotate_substack_review_token", {
      version_id: version.id,
      new_token_hash: digest,
    });
  }

  try {
    await sendReviewEmail(deps.supabase, version.id, rawToken);
    return safeVersion(version, {
      reused,
      review_email_sent: true,
    });
  } catch (error) {
    const message = errorMessage(error);
    await rpcOne(deps.supabase, "record_substack_review_email_failure", {
      version_id: version.id,
      failure_message: message,
    });
    return safeVersion(version, {
      reused,
      review_email_sent: false,
      error: message,
    });
  }
}

export async function getNextAction(dependencies = {}) {
  const deps = resolveDependencies(dependencies);
  return rpcOne(deps.supabase, "next_substack_review_action");
}

export async function claimApprovedVersion(workerId, dependencies = {}) {
  const deps = resolveDependencies(dependencies);
  return rpcOne(deps.supabase, "claim_substack_review_publication", {
    worker_id: requireText(workerId, "Worker identifier"),
  });
}

function validatePublicationUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("A verified HTTPS Substack URL is required");
  }
  if (
    url.protocol !== "https:" ||
    !(url.hostname === "substack.com" || url.hostname.endsWith(".substack.com")) ||
    url.pathname === "/"
  ) {
    throw new Error("A verified HTTPS Substack URL is required");
  }
  return url.toString();
}

export async function markPublished(
  versionId,
  url,
  rssGuid,
  dependencies = {},
) {
  const deps = resolveDependencies(dependencies);
  const id = requireText(versionId, "Version identifier");
  const publicationUrl = validatePublicationUrl(url);
  const guid = requireText(rssGuid, "RSS GUID");
  const version = await rpcOne(deps.supabase, "mark_substack_review_published", {
    version_id: id,
    publication_url: publicationUrl,
    publication_rss_guid: guid,
  });
  if (!version) throw new Error("The publication result was not recorded");

  const { data, error } = await deps.supabase.functions.invoke(
    "send-substack-review-email",
    { body: { action: "published", version_id: id } },
  );
  return safeVersion(version, {
    published_url: version.published_url,
    rss_guid: version.rss_guid ?? guid,
    publication_notice_sent: !error && Boolean(data?.success),
    ...(error ? { notice_error: errorMessage(error) } : {}),
  });
}

export async function markVerificationFailed(
  versionId,
  message,
  dependencies = {},
) {
  const deps = resolveDependencies(dependencies);
  return rpcOne(deps.supabase, "mark_substack_review_verification_failed", {
    version_id: requireText(versionId, "Version identifier"),
    failure_message: requireText(message, "Verification failure message"),
  });
}
