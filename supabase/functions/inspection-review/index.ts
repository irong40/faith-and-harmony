// inspection-review edge function: wiring only. Logic lives in handler.ts.
//
// verify_jwt = false (supabase/config.toml): the function does its own auth.
// POST send needs the service role key (or a registered sb_secret_ key); the
// GET decision link carries no JWT, only the single-use review token.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEYS (all
// auto-provided by Supabase) and RESEND_API_KEY (already set on the project).
// No new secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  type DecisionResult,
  handleInspectionReview,
  type InspectionReviewDependencies,
  parseRuntimeSecretKeys,
} from "./handler.ts";
import { type EmailPayload, FROM_EMAIL, type ReviewRun, sendWithResend } from "./email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_SECRET_KEYS = parseRuntimeSecretKeys(
  Deno.env.get("SUPABASE_SECRET_KEYS") ?? "",
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const runColumns = [
  "id",
  "run_key",
  "profile",
  "status",
  "expected_detections",
  "documented_extent_m2",
  "created_at",
  "code_version",
  "e3_summary",
  "outputs",
  "review_token_hash",
  "review_token_expires_at",
].join(",");

function requireEnvironment(): void {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    throw new Error("inspection-review environment is incomplete");
  }
}

function createDependencies(): InspectionReviewDependencies {
  requireEnvironment();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    secretKeys: SUPABASE_SECRET_KEYS,
    functionsBaseUrl: SUPABASE_URL,
    now: () => new Date(),
    loadRunById: async (id) => {
      const { data, error } = await supabase
        .from("inspection_runs")
        .select(runColumns)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? data as unknown as ReviewRun : null;
    },
    loadRunByTokenHash: async (hash) => {
      const { data, error } = await supabase
        .from("inspection_runs")
        .select(runColumns)
        .eq("review_token_hash", hash)
        .maybeSingle();
      if (error) throw error;
      return data ? data as unknown as ReviewRun : null;
    },
    sendEmail: async (payload: EmailPayload) => {
      const result = await sendWithResend(
        fetch,
        { apiKey: RESEND_API_KEY, from: FROM_EMAIL },
        payload,
      );
      if (!result) {
        console.error("[inspection-review] Resend rejected message");
        return null;
      }
      return result;
    },
    markEmailSent: async ({ id, sentAt }) => {
      const { error } = await supabase
        .from("inspection_runs")
        .update({ review_email_sent_at: sentAt })
        .eq("id", id)
        .eq("status", "awaiting_review");
      if (error) throw error;
    },
    decide: async ({ id, status, reviewedBy }): Promise<DecisionResult> => {
      // Optimistic: only a run still awaiting review can be decided. The
      // database guard stamps reviewed_at and refuses anything else.
      const { data, error } = await supabase
        .from("inspection_runs")
        .update({ status, reviewed_by: reviewedBy })
        .eq("id", id)
        .eq("status", "awaiting_review")
        .select("id,status");
      if (error) return { kind: "refused", message: error.message };
      if (!data || data.length === 0) return { kind: "stale" };
      return { kind: "ok" };
    },
    logError: (message) => console.error(`[inspection-review] ${message}`),
  };
}

Deno.serve(async (request) => {
  try {
    return await handleInspectionReview(request, createDependencies());
  } catch (error) {
    console.error("[inspection-review] request failed", error);
    return new Response("Review service unavailable.\n", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
