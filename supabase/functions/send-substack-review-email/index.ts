import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  handleSubstackReviewEmail,
  type EmailDependencies,
} from "./handler.ts";
import { sendWithResend } from "./resend.ts";
import type {
  EmailPayload,
  ReviewEmailVersion,
} from "./template.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const REVIEW_BASE_URL = Deno.env.get("SUBSTACK_REVIEW_BASE_URL") ?? "";
const FROM_EMAIL = Deno.env.get("SUBSTACK_REVIEW_FROM_EMAIL") ?? "";

const versionColumns = [
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
  "token_hash",
  "published_url",
].join(",");

function requireEnvironment(): void {
  if (
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !RESEND_API_KEY ||
    !REVIEW_BASE_URL ||
    !FROM_EMAIL
  ) {
    throw new Error("Substack review email environment is incomplete");
  }
}

function createDependencies(): EmailDependencies {
  requireEnvironment();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    reviewBaseUrl: REVIEW_BASE_URL,
    now: () => new Date(),
    loadVersion: async (id) => {
      const { data, error } = await supabase
        .from("substack_review_versions")
        .select(versionColumns)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? data as unknown as ReviewEmailVersion : null;
    },
    sendEmail: async (payload: EmailPayload) => {
      const result = await sendWithResend(
        fetch,
        { apiKey: RESEND_API_KEY, from: FROM_EMAIL },
        payload,
      );
      if (!result) {
        console.error("[send-substack-review-email] Resend rejected message");
        return null;
      }
      return result;
    },
    markReviewSent: async ({ id, messageId, sentAt }) => {
      const { error } = await supabase
        .from("substack_review_versions")
        .update({ review_message_id: messageId, review_sent_at: sentAt })
        .eq("id", id)
        .eq("status", "pending_review");
      if (error) throw error;
    },
    markPublicationSent: async ({ id, messageId, sentAt }) => {
      const { error } = await supabase
        .from("substack_review_versions")
        .update({
          publication_message_id: messageId,
          publication_notice_sent_at: sentAt,
        })
        .eq("id", id)
        .eq("status", "published");
      if (error) throw error;
    },
    logError: (message) => console.error(`[send-substack-review-email] ${message}`),
  };
}

Deno.serve(async (request) => {
  try {
    return await handleSubstackReviewEmail(request, createDependencies());
  } catch (error) {
    console.error("[send-substack-review-email] request failed", error);
    return new Response(JSON.stringify({ error: "Email service unavailable" }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  }
});
