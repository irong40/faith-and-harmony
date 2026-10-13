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
  handleInspectionReview,
  type InspectionReviewDependencies,
  parseRuntimeSecretKeys,
} from "./handler.ts";
import { type EmailPayload, FROM_EMAIL, sendWithResend } from "./email.ts";
import { createRunStore } from "./store.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_SECRET_KEYS = parseRuntimeSecretKeys(
  Deno.env.get("SUPABASE_SECRET_KEYS") ?? "",
);
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

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
    ...createRunStore(supabase),
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
