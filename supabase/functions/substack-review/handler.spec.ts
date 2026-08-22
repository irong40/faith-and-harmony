import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  handleSubstackReview,
  type ReviewDependencies,
  type ReviewVersion,
} from "./handler.ts";
import { hashReviewToken } from "./domain.ts";

const NOW = new Date("2026-08-22T12:00:00.000Z");

function version(
  overrides: Partial<ReviewVersion> = {},
): ReviewVersion {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    draft_id: "beach-airspace",
    version: 2,
    status: "pending_review",
    selected_headline: "The Drone Stayed on the Ground",
    subtitle: "What stopped the field test",
    article_markdown: "The reviewed article body.",
    notes_teaser: "The short teaser.",
    subscribe_call: "Subscribe for the next field report.",
    content_hash: "a".repeat(64),
    expires_at: "2026-08-23T12:00:00.000Z",
    requested_changes: null,
    published_url: null,
    ...overrides,
  };
}

type Calls = {
  findHashes: string[];
  changeInputs: unknown[];
  approvalInputs: unknown[];
  events: unknown[];
};

function dependencies(options: {
  reviewer?: { id: string; email: string } | null;
  stored?: ReviewVersion | null;
  changed?: ReviewVersion | null;
  approved?: ReviewVersion | null;
} = {}): { deps: ReviewDependencies; calls: Calls } {
  const calls: Calls = {
    findHashes: [],
    changeInputs: [],
    approvalInputs: [],
    events: [],
  };
  const reviewer = options.reviewer === undefined
    ? {
      id: "22222222-2222-4222-8222-222222222222",
      email: "dradamopierce@gmail.com",
    }
    : options.reviewer;
  const stored = options.stored === undefined ? version() : options.stored;

  return {
    calls,
    deps: {
      now: () => NOW,
      authenticate: async () => reviewer,
      findVersionByTokenHash: async (hash) => {
        calls.findHashes.push(hash);
        return stored;
      },
      requestChanges: async (input) => {
        calls.changeInputs.push(input);
        return options.changed === undefined
          ? version({
            status: "changes_requested",
            requested_changes: input.changes,
          })
          : options.changed;
      },
      approveVersion: async (input) => {
        calls.approvalInputs.push(input);
        return options.approved === undefined
          ? version({ status: "approved" })
          : options.approved;
      },
      appendEvent: async (event) => {
        calls.events.push(event);
      },
    },
  };
}

function request(
  body: unknown,
  options: { method?: string; authorization?: string | null } = {},
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (options.authorization !== null) {
    headers.set(
      "Authorization",
      options.authorization ?? "Bearer valid-reviewer-session",
    );
  }

  return new Request("https://example.test/functions/v1/substack-review", {
    method: options.method ?? "POST",
    headers,
    body: options.method === "GET" ? undefined : JSON.stringify(body),
  });
}

async function responseJson(response: Response) {
  return await response.json();
}

Deno.test("OPTIONS is safe and performs no review action", async () => {
  const { deps, calls } = dependencies();

  const response = await handleSubstackReview(
    new Request("https://example.test", { method: "OPTIONS" }),
    deps,
  );

  assertEquals(response.status, 204);
  assertEquals(calls.findHashes.length, 0);
});

Deno.test("rejects a missing authorization header before loading content", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReview(
    request({ action: "load", token: "secret" }, { authorization: null }),
    deps,
  );

  assertEquals(response.status, 401);
  assertEquals(calls.findHashes.length, 0);
});

Deno.test("rejects an invalid authenticated session", async () => {
  const { deps, calls } = dependencies({ reviewer: null });
  const response = await handleSubstackReview(
    request({ action: "load", token: "secret" }),
    deps,
  );

  assertEquals(response.status, 401);
  assertEquals(calls.findHashes.length, 0);
});

Deno.test("rejects the wrong Google account before loading content", async () => {
  const { deps, calls } = dependencies({
    reviewer: {
      id: "33333333-3333-4333-8333-333333333333",
      email: "someone@example.com",
    },
  });
  const response = await handleSubstackReview(
    request({ action: "load", token: "secret" }),
    deps,
  );

  assertEquals(response.status, 403);
  assertEquals(calls.findHashes.length, 0);
});

Deno.test("rejects GET so an email scanner cannot mutate state", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReview(
    request({}, { method: "GET" }),
    deps,
  );

  assertEquals(response.status, 405);
  assertEquals(calls.findHashes.length, 0);
});

Deno.test("returns gone for an expired review link", async () => {
  const { deps } = dependencies({
    stored: version({ expires_at: NOW.toISOString() }),
  });
  const response = await handleSubstackReview(
    request({ action: "load", token: "secret" }),
    deps,
  );

  assertEquals(response.status, 410);
});

Deno.test("returns conflict for a superseded review link", async () => {
  const { deps } = dependencies({
    stored: version({ status: "superseded" }),
  });
  const response = await handleSubstackReview(
    request({ action: "load", token: "secret" }),
    deps,
  );

  assertEquals(response.status, 409);
});

Deno.test("loads only the safe reviewed snapshot", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReview(
    request({ action: "load", token: "raw-review-token" }),
    deps,
  );
  const body = await responseJson(response);

  assertEquals(response.status, 200);
  assertEquals(body.review.selected_headline, "The Drone Stayed on the Ground");
  assertEquals(body.review.article_markdown, "The reviewed article body.");
  assertEquals(body.review.token_hash, undefined);
  assertEquals(calls.findHashes, [await hashReviewToken("raw-review-token")]);
});

Deno.test("rejects a blank change request", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReview(
    request({ action: "request_changes", token: "secret", changes: "   " }),
    deps,
  );

  assertEquals(response.status, 400);
  assertEquals(calls.changeInputs.length, 0);
});

Deno.test("records trimmed editorial changes without approving", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReview(
    request({
      action: "request_changes",
      token: "secret",
      changes: "  Clarify the Sandbridge boundary source.  ",
    }),
    deps,
  );

  assertEquals(response.status, 200);
  assertEquals(calls.changeInputs.length, 1);
  assertEquals(calls.changeInputs[0], {
    id: version().id,
    expectedStatus: "pending_review",
    changes: "Clarify the Sandbridge boundary source.",
    requestedAt: NOW.toISOString(),
  });
  assertEquals(calls.approvalInputs.length, 0);
  assertEquals(calls.events.length, 1);
});

Deno.test("rejects approval without the explicit confirmation flag", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReview(
    request({
      action: "approve",
      token: "secret",
      version: 2,
      content_hash: "a".repeat(64),
    }),
    deps,
  );

  assertEquals(response.status, 400);
  assertEquals(calls.approvalInputs.length, 0);
});

Deno.test("rejects approval for a stale content snapshot", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReview(
    request({
      action: "approve",
      token: "secret",
      version: 1,
      content_hash: "a".repeat(64),
      confirm_publish: true,
    }),
    deps,
  );

  assertEquals(response.status, 409);
  assertEquals(calls.approvalInputs.length, 0);
});

Deno.test("approves the exact snapshot and writes one audit event", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReview(
    request({
      action: "approve",
      token: "secret",
      version: 2,
      content_hash: "a".repeat(64),
      confirm_publish: true,
    }),
    deps,
  );
  const body = await responseJson(response);

  assertEquals(response.status, 200);
  assertEquals(body.status, "approved");
  assertEquals(calls.approvalInputs.length, 1);
  assertEquals(calls.events.length, 1);
});

Deno.test("returns an idempotent result for a duplicate approval", async () => {
  const { deps, calls } = dependencies({
    stored: version({ status: "approved" }),
  });
  const response = await handleSubstackReview(
    request({
      action: "approve",
      token: "secret",
      version: 2,
      content_hash: "a".repeat(64),
      confirm_publish: true,
    }),
    deps,
  );
  const body = await responseJson(response);

  assertEquals(response.status, 200);
  assertEquals(body.status, "approved");
  assertEquals(body.idempotent, true);
  assertEquals(calls.approvalInputs.length, 0);
  assertEquals(calls.events.length, 0);
});

Deno.test("returns conflict when a compare and set update loses a race", async () => {
  const { deps, calls } = dependencies({ approved: null });
  const response = await handleSubstackReview(
    request({
      action: "approve",
      token: "secret",
      version: 2,
      content_hash: "a".repeat(64),
      confirm_publish: true,
    }),
    deps,
  );

  assertEquals(response.status, 409);
  assertEquals(calls.events.length, 0);
});

Deno.test("rejects an unsupported action", async () => {
  const { deps } = dependencies();
  const response = await handleSubstackReview(
    request({ action: "publish_now", token: "secret" }),
    deps,
  );
  const body = await responseJson(response);

  assertEquals(response.status, 400);
  assertStringIncludes(body.error, "Unsupported review action");
});
