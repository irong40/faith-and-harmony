import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  handleSubstackReviewEmail,
  type EmailDependencies,
} from "./handler.ts";
import type { ReviewEmailVersion } from "./template.ts";
import { hashReviewToken } from "../substack-review/domain.ts";

const SERVICE_KEY = "service-role-secret";
const NOW = new Date("2026-08-22T14:00:00.000Z");

function version(
  overrides: Partial<ReviewEmailVersion> = {},
): ReviewEmailVersion {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    draft_id: "beach-airspace",
    version: 3,
    status: "pending_review",
    selected_headline: "The Drone Stayed on the Ground",
    subtitle: "What stopped the field test",
    article_markdown: "The full article.",
    notes_teaser: "A short note.",
    subscribe_call: "Subscribe for the next report.",
    content_hash: "a".repeat(64),
    token_hash: "b".repeat(64),
    published_url: null,
    ...overrides,
  };
}

type Calls = {
  sent: unknown[];
  reviewMarks: unknown[];
  publicationMarks: unknown[];
  logs: string[];
};

function dependencies(options: {
  stored?: ReviewEmailVersion | null;
  sendResult?: { id: string } | null;
} = {}): { deps: EmailDependencies; calls: Calls } {
  const calls: Calls = {
    sent: [],
    reviewMarks: [],
    publicationMarks: [],
    logs: [],
  };
  return {
    calls,
    deps: {
      serviceRoleKey: SERVICE_KEY,
      reviewBaseUrl: "https://faithandharmonyllc.com",
      now: () => NOW,
      loadVersion: async () => options.stored === undefined
        ? version()
        : options.stored,
      sendEmail: async (email) => {
        calls.sent.push(email);
        return options.sendResult === undefined
          ? { id: "email_123" }
          : options.sendResult;
      },
      markReviewSent: async (input) => {
        calls.reviewMarks.push(input);
      },
      markPublicationSent: async (input) => {
        calls.publicationMarks.push(input);
      },
      logError: (message) => calls.logs.push(message),
    },
  };
}

function request(
  body: unknown,
  authorization = `Bearer ${SERVICE_KEY}`,
): Request {
  return new Request("https://example.test/functions/v1/send-substack-review-email", {
    method: "POST",
    headers: {
      "Authorization": authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function body(response: Response) {
  return await response.json();
}

Deno.test("rejects a caller without the exact service credential", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReviewEmail(
    request({ action: "published", version_id: version().id }, "Bearer wrong"),
    deps,
  );

  assertEquals(response.status, 401);
  assertEquals(calls.sent.length, 0);
});

Deno.test("rejects review mail when the raw token does not match storage", async () => {
  const rawToken = "actual-token";
  const { deps, calls } = dependencies({
    stored: version({ token_hash: await hashReviewToken(rawToken) }),
  });
  const response = await handleSubstackReviewEmail(
    request({
      action: "review",
      version_id: version().id,
      token: "wrong-token",
    }),
    deps,
  );

  assertEquals(response.status, 409);
  assertEquals(calls.sent.length, 0);
});

Deno.test("loads review content from storage and marks only after send", async () => {
  const rawToken = "actual-token";
  const stored = version({
    token_hash: await hashReviewToken(rawToken),
    selected_headline: "Stored headline",
  });
  const { deps, calls } = dependencies({ stored });
  const response = await handleSubstackReviewEmail(
    request({
      action: "review",
      version_id: stored.id,
      token: rawToken,
      selected_headline: "Untrusted replacement",
    }),
    deps,
  );

  assertEquals(response.status, 200);
  assertEquals(calls.sent.length, 1);
  assertStringIncludes(
    (calls.sent[0] as { subject: string }).subject,
    "Stored headline",
  );
  assertEquals(calls.reviewMarks, [{
    id: stored.id,
    messageId: "email_123",
    sentAt: NOW.toISOString(),
  }]);
});

Deno.test("does not mark review sent when Resend fails", async () => {
  const rawToken = "actual-token";
  const { deps, calls } = dependencies({
    stored: version({ token_hash: await hashReviewToken(rawToken) }),
    sendResult: null,
  });
  const response = await handleSubstackReviewEmail(
    request({
      action: "review",
      version_id: version().id,
      token: rawToken,
    }),
    deps,
  );

  assertEquals(response.status, 502);
  assertEquals(calls.reviewMarks.length, 0);
});

Deno.test("sends the verified link only for a published version", async () => {
  const published = version({
    status: "published",
    published_url: "https://dradamopierce.substack.com/p/live-post",
  });
  const { deps, calls } = dependencies({ stored: published });
  const response = await handleSubstackReviewEmail(
    request({ action: "published", version_id: published.id }),
    deps,
  );

  assertEquals(response.status, 200);
  assertEquals(calls.sent.length, 1);
  assertEquals(calls.publicationMarks, [{
    id: published.id,
    messageId: "email_123",
    sentAt: NOW.toISOString(),
  }]);
});

Deno.test("rejects publication mail without a verified live URL", async () => {
  const { deps, calls } = dependencies();
  const response = await handleSubstackReviewEmail(
    request({ action: "published", version_id: version().id }),
    deps,
  );

  assertEquals(response.status, 409);
  assertEquals(calls.sent.length, 0);
});

Deno.test("never writes a raw review token to error logs", async () => {
  const rawToken = "token-that-must-not-be-logged";
  const { deps, calls } = dependencies({ stored: null });
  const response = await handleSubstackReviewEmail(
    request({
      action: "review",
      version_id: version().id,
      token: rawToken,
    }),
    deps,
  );

  assertEquals(response.status, 404);
  assertEquals(calls.logs.some((entry) => entry.includes(rawToken)), false);
});

Deno.test("rejects unsupported email actions", async () => {
  const { deps } = dependencies();
  const response = await handleSubstackReviewEmail(
    request({ action: "publish", version_id: version().id }),
    deps,
  );
  const responseBody = await body(response);

  assertEquals(response.status, 400);
  assertStringIncludes(responseBody.error, "Unsupported email action");
});
