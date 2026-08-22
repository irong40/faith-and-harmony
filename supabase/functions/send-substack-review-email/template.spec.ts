import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildPublishedEmail,
  buildReviewEmail,
  REVIEW_EMAIL,
  type ReviewEmailVersion,
} from "./template.ts";

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
    article_markdown: "First paragraph.\n\nSecond paragraph.",
    notes_teaser: "A short field note.",
    subscribe_call: "Subscribe for the next field report.",
    content_hash: "a".repeat(64),
    token_hash: "b".repeat(64),
    published_url: null,
    ...overrides,
  };
}

Deno.test("review email targets the approved Gmail address", () => {
  const email = buildReviewEmail(
    version(),
    "raw-token",
    "https://faithandharmonyllc.com",
  );

  assertEquals(email.to, REVIEW_EMAIL);
  assertStringIncludes(email.subject, "The Drone Stayed on the Ground");
});

Deno.test("review email includes the full review package and both safe links", () => {
  const email = buildReviewEmail(
    version(),
    "raw token/with symbols",
    "https://faithandharmonyllc.com/",
  );

  assertStringIncludes(email.html, "The Drone Stayed on the Ground");
  assertStringIncludes(email.html, "What stopped the field test");
  assertStringIncludes(email.html, "First paragraph.");
  assertStringIncludes(email.html, "Second paragraph.");
  assertStringIncludes(email.html, "A short field note.");
  assertStringIncludes(email.html, "beach-airspace");
  assertStringIncludes(email.html, "Version 3");
  assertStringIncludes(
    email.html,
    "/substack/review/raw%20token%2Fwith%20symbols?intent=approve",
  );
  assertStringIncludes(
    email.html,
    "/substack/review/raw%20token%2Fwith%20symbols?intent=changes",
  );
});

Deno.test("review email states the exact publication effect", () => {
  const email = buildReviewEmail(
    version(),
    "raw-token",
    "https://faithandharmonyllc.com",
  );

  assertStringIncludes(email.html, "publishes the article publicly");
  assertStringIncludes(email.html, "emails all Substack subscribers immediately");
  assertStringIncludes(email.text, "publishes the article publicly");
});

Deno.test("review email escapes article fields before rendering HTML", () => {
  const email = buildReviewEmail(
    version({
      selected_headline: '<img src=x onerror="alert(1)">',
      article_markdown: "<script>steal()</script>",
    }),
    "raw-token",
    "https://faithandharmonyllc.com",
  );

  assertEquals(email.html.includes("<script>"), false);
  assertEquals(email.html.includes("<img"), false);
  assertStringIncludes(email.html, "&lt;script&gt;steal()&lt;/script&gt;");
  assertStringIncludes(email.html, "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});

Deno.test("published email requires and includes the verified live link", () => {
  const email = buildPublishedEmail(version({
    status: "published",
    published_url: "https://dradamopierce.substack.com/p/the-drone-stayed-grounded",
  }));

  assertEquals(email.to, REVIEW_EMAIL);
  assertStringIncludes(email.subject, "Published");
  assertStringIncludes(
    email.html,
    "https://dradamopierce.substack.com/p/the-drone-stayed-grounded",
  );
});
