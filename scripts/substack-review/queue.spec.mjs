import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  claimApprovedVersion,
  enqueueDraft,
  getNextAction,
  markPublished,
  markVerificationFailed,
} from "./queue.mjs";

const fixture = (name) => path.resolve("scripts/substack-review/fixtures", name);

function createFakeSupabase(options = {}) {
  const calls = [];
  const state = {
    nextVersion: 1,
    records: [],
    claimed: false,
  };

  return {
    calls,
    state,
    functions: {
      invoke: async (name, input) => {
        calls.push({ type: "function", name, input });
        if (options.emailError) return { data: null, error: new Error("mail unavailable") };
        return { data: { success: true, message_id: "email-123" }, error: null };
      },
    },
    rpc: async (name, args) => {
      calls.push({ type: "rpc", name, args });

      if (name === "enqueue_substack_review_version") {
        const existing = state.records.find(
          (record) => record.draft_id === args.input_draft_id &&
            ["pending_review", "changes_requested", "approved", "verification_failed"].includes(record.status),
        );
        if (existing?.content_hash === args.input_content_hash && existing.status === "pending_review") {
          return { data: [{ ...existing, reused: true }], error: null };
        }
        if (existing) existing.status = "superseded";
        const record = {
          id: `00000000-0000-4000-8000-${String(state.nextVersion).padStart(12, "0")}`,
          draft_id: args.input_draft_id,
          version: state.nextVersion,
          status: "pending_review",
          selected_headline: args.input_selected_headline,
          subtitle: args.input_subtitle,
          article_markdown: args.input_article_markdown,
          notes_teaser: args.input_notes_teaser,
          subscribe_call: args.input_subscribe_call,
          source_path: args.input_source_path,
          content_hash: args.input_content_hash,
          token_hash: args.input_token_hash,
          review_sent_at: null,
          reused: false,
        };
        state.nextVersion += 1;
        state.records.push(record);
        return { data: [record], error: null };
      }

      if (name === "rotate_substack_review_token") {
        const record = state.records.find((item) => item.id === args.version_id);
        record.token_hash = args.new_token_hash;
        return { data: [record], error: null };
      }

      if (name === "next_substack_review_action") {
        return { data: options.nextAction ? [options.nextAction] : [], error: null };
      }

      if (name === "claim_substack_review_publication") {
        if (state.claimed) return { data: [], error: null };
        state.claimed = true;
        return { data: options.claimedVersion ? [options.claimedVersion] : [], error: null };
      }

      if (name === "mark_substack_review_published") {
        return { data: [{ id: args.version_id, status: "published", published_url: args.publication_url }], error: null };
      }

      if (name === "mark_substack_review_verification_failed") {
        return { data: [{ id: args.version_id, status: "verification_failed", last_error: args.failure_message }], error: null };
      }

      if (name === "record_substack_review_email_failure") {
        return { data: [{ id: args.version_id, status: "pending_review", last_error: args.failure_message }], error: null };
      }

      throw new Error(`Unexpected RPC: ${name}`);
    },
  };
}

function deps(supabase, overrides = {}) {
  return {
    supabase,
    readFile,
    reviewEmail: "dradamopierce@gmail.com",
    now: () => new Date("2026-08-22T12:00:00.000Z"),
    draftOptions: { minWords: 1, maxWords: 2000 },
    ...overrides,
  };
}

test("creates version one with a random token digest and sends the raw token only to email", async () => {
  const supabase = createFakeSupabase();
  const result = await enqueueDraft(fixture("valid-draft.md"), deps(supabase));

  assert.equal(result.version, 1);
  assert.equal(result.status, "pending_review");
  assert.equal(result.review_email_sent, true);
  assert.equal("token" in result, false);

  const enqueueCall = supabase.calls.find((call) => call.name === "enqueue_substack_review_version");
  const emailCall = supabase.calls.find((call) => call.type === "function");
  const rawToken = emailCall.input.body.token;
  assert.match(rawToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(
    enqueueCall.args.input_token_hash,
    createHash("sha256").update(rawToken, "utf8").digest("hex"),
  );
  assert.equal(JSON.stringify(enqueueCall).includes(rawToken), false);
});

test("supersedes the previous open review through the atomic enqueue RPC", async () => {
  const supabase = createFakeSupabase();
  const first = await enqueueDraft(fixture("valid-draft.md"), deps(supabase));
  const markdown = await readFile(fixture("valid-draft.md"), "utf8");
  const revised = markdown.replace(
    'title: "The Drone Stayed on the Ground"',
    'title: "The Ground Test Changed the Plan"',
  );

  await enqueueDraft(fixture("valid-draft.md"), deps(supabase, {
    readFile: async () => revised,
  }));

  assert.equal(supabase.state.records.find((record) => record.id === first.id).status, "superseded");
  assert.equal(supabase.state.records.at(-1).version, 2);
  assert.equal(
    supabase.calls.filter((call) => call.name === "enqueue_substack_review_version").length,
    2,
  );
});

test("retries only the review email for the same unsent content", async () => {
  const supabase = createFakeSupabase({ emailError: true });
  const first = await enqueueDraft(fixture("valid-draft.md"), deps(supabase));
  assert.equal(first.review_email_sent, false);
  assert.equal(supabase.state.records.length, 1);

  supabase.functions.invoke = async (name, input) => {
    supabase.calls.push({ type: "function", name, input });
    return { data: { success: true }, error: null };
  };
  const retry = await enqueueDraft(fixture("valid-draft.md"), deps(supabase));

  assert.equal(retry.id, first.id);
  assert.equal(retry.version, first.version);
  assert.equal(supabase.state.records.length, 1);
  assert.equal(
    supabase.calls.filter((call) => call.name === "rotate_substack_review_token").length,
    1,
  );
});

test("refuses unresolved verification markers before touching Supabase", async () => {
  const supabase = createFakeSupabase();
  await assert.rejects(
    enqueueDraft(fixture("unverified-draft.md"), deps(supabase)),
    /\[VERIFY\]/,
  );
  assert.equal(supabase.calls.length, 0);
});

test("lists one safe next action", async () => {
  const supabase = createFakeSupabase({
    nextAction: {
      action: "revise",
      id: "11111111-1111-4111-8111-111111111111",
      draft_id: "field-report",
      version: 2,
      status: "changes_requested",
      source_path: "C:\\draft.md",
      content_hash: "a".repeat(64),
      requested_changes: "Tighten the opening.",
    },
  });
  const action = await getNextAction(deps(supabase));
  assert.equal(action.action, "revise");
  assert.equal("article_markdown" in action, false);
});

test("claims one approved version atomically and protects against duplicate claims", async () => {
  const claimedVersion = {
    id: "22222222-2222-4222-8222-222222222222",
    status: "publishing",
    article_markdown: "Approved article",
  };
  const supabase = createFakeSupabase({ claimedVersion });
  const first = await claimApprovedVersion("worker-a", deps(supabase));
  const duplicate = await claimApprovedVersion("worker-b", deps(supabase));
  assert.equal(first.id, claimedVersion.id);
  assert.equal(duplicate, null);
});

test("records verified publication and sends the verified link email", async () => {
  const supabase = createFakeSupabase();
  const result = await markPublished(
    "33333333-3333-4333-8333-333333333333",
    "https://dradamopierce.substack.com/p/tested-pipeline",
    "rss-guid-1",
    deps(supabase),
  );
  assert.equal(result.status, "published");
  const emailCall = supabase.calls.find((call) => call.type === "function");
  assert.deepEqual(emailCall.input.body, {
    action: "published",
    version_id: "33333333-3333-4333-8333-333333333333",
  });
});

test("refuses an unverified or non-Substack publication URL", async () => {
  const supabase = createFakeSupabase();
  await assert.rejects(
    markPublished("id", "http://example.com/post", "guid", deps(supabase)),
    /HTTPS Substack URL/,
  );
  assert.equal(supabase.calls.length, 0);
});

test("records a publication verification failure", async () => {
  const supabase = createFakeSupabase();
  const result = await markVerificationFailed(
    "44444444-4444-4444-8444-444444444444",
    "RSS entry did not appear",
    deps(supabase),
  );
  assert.equal(result.status, "verification_failed");
  assert.equal(result.last_error, "RSS entry did not appear");
});
