// Database access for inspection-review, split from index.ts so the exact
// supabase-js calls (and their optimistic status filters) are under test.
// The database guard (inspection_runs_guard) remains the real gate; these
// filters make a lost race answer "stale" instead of a guard error.

import type { DecisionResult, InspectionReviewDependencies } from "./handler.ts";
import type { ReviewRun } from "./email.ts";

export const RUN_COLUMNS = [
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

// The slice of a supabase-js client this module uses. PostgREST builders are
// chainable and awaitable; typing them fully would mean importing the client
// types here, which index.ts already pins.
// deno-lint-ignore no-explicit-any
export type RunStoreClient = { from: (table: string) => any };

export type RunStore = Pick<
  InspectionReviewDependencies,
  "loadRunById" | "loadRunByTokenHash" | "markEmailSent" | "decide"
>;

export function createRunStore(client: RunStoreClient): RunStore {
  const runs = () => client.from("inspection_runs");

  async function loadOne(column: string, value: string): Promise<ReviewRun | null> {
    const { data, error } = await runs().select(RUN_COLUMNS).eq(column, value).maybeSingle();
    if (error) throw error;
    return data ? data as ReviewRun : null;
  }

  return {
    loadRunById: (id) => loadOne("id", id),
    loadRunByTokenHash: (hash) => loadOne("review_token_hash", hash),
    markEmailSent: async ({ id, sentAt }) => {
      const { error } = await runs()
        .update({ review_email_sent_at: sentAt })
        .eq("id", id)
        .eq("status", "awaiting_review");
      if (error) throw error;
    },
    decide: async ({ id, status, reviewedBy }): Promise<DecisionResult> => {
      // Optimistic: only a run still awaiting review can be decided. The
      // database guard stamps reviewed_at and refuses anything else.
      const { data, error } = await runs()
        .update({ status, reviewed_by: reviewedBy })
        .eq("id", id)
        .eq("status", "awaiting_review")
        .select("id,status");
      if (error) return { kind: "refused", message: error.message };
      if (!data || data.length === 0) return { kind: "stale" };
      return { kind: "ok" };
    },
  };
}
