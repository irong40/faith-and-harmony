import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleSubstackReview,
  type ApprovalInput,
  type ChangeRequestInput,
  type ReviewDependencies,
  type ReviewEvent,
  type ReviewVersion,
} from "./handler.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const reviewColumns = [
  "id",
  "draft_id",
  "version",
  "status",
  "selected_headline",
  "subtitle",
  "article_markdown",
  "notes_teaser",
  "subscribe_call",
  "content_hash",
  "expires_at",
  "requested_changes",
  "published_url",
].join(",");

function requireEnvironment(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Substack review environment is incomplete");
  }
}

function asReviewVersion(value: unknown): ReviewVersion | null {
  return value ? value as ReviewVersion : null;
}

function createDependencies(): ReviewDependencies {
  requireEnvironment();
  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    now: () => new Date(),
    authenticate: async (request) => {
      const authorization = request.headers.get("Authorization") ?? "";
      const token = authorization.replace(/^Bearer\s+/i, "");
      if (!token) return null;

      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user }, error } = await userClient.auth.getUser();
      if (error || !user?.email) return null;
      return { id: user.id, email: user.email };
    },
    findVersionByTokenHash: async (tokenHash) => {
      const { data, error } = await service
        .from("substack_review_versions")
        .select(reviewColumns)
        .eq("token_hash", tokenHash)
        .maybeSingle();
      if (error) throw error;
      return asReviewVersion(data);
    },
    requestChanges: async (input: ChangeRequestInput) => {
      const { data, error } = await service
        .from("substack_review_versions")
        .update({
          status: "changes_requested",
          requested_changes: input.changes,
          requested_at: input.requestedAt,
        })
        .eq("id", input.id)
        .eq("status", input.expectedStatus)
        .select(reviewColumns)
        .maybeSingle();
      if (error) throw error;
      return asReviewVersion(data);
    },
    approveVersion: async (input: ApprovalInput) => {
      const { data, error } = await service
        .from("substack_review_versions")
        .update({
          status: "approved",
          approved_at: input.approvedAt,
          approved_by: input.approvedBy,
        })
        .eq("id", input.id)
        .eq("status", input.expectedStatus)
        .eq("version", input.version)
        .eq("content_hash", input.contentHash)
        .select(reviewColumns)
        .maybeSingle();
      if (error) throw error;
      return asReviewVersion(data);
    },
    appendEvent: async (event: ReviewEvent) => {
      const { error } = await service.from("substack_review_events").insert({
        version_id: event.versionId,
        event_type: event.eventType,
        actor_type: event.actorType,
        actor_identifier: event.actorIdentifier,
        metadata: event.metadata,
      });
      if (error) throw error;
    },
  };
}

Deno.serve(async (request) => {
  try {
    return await handleSubstackReview(request, createDependencies());
  } catch (error) {
    console.error("[substack-review] request failed", error);
    return new Response(JSON.stringify({ error: "Review service unavailable" }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});
