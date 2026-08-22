import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  APPROVED_REVIEW_EMAIL,
  assertTransition,
  getApprovalDisposition,
  hashReviewContent,
  hashReviewToken,
  isActiveVersion,
  isExpired,
  normalizeEmail,
} from "./domain.ts";

Deno.test("normalizes the approved reviewer email", () => {
  assertEquals(
    normalizeEmail(" DrAdamOPierce@GMAIL.com "),
    APPROVED_REVIEW_EMAIL,
  );
});

Deno.test("accepts a legal review transition", () => {
  assertEquals(assertTransition("pending_review", "approved"), undefined);
});

Deno.test("rejects an illegal review transition", () => {
  assertThrows(
    () => assertTransition("pending_review", "published"),
    Error,
    "Illegal review transition",
  );
});

Deno.test("hashes a review token without returning the raw token", async () => {
  const digest = await hashReviewToken("raw-secret-token");

  assertEquals(digest.length, 64);
  assertEquals(digest.includes("raw-secret-token"), false);
  assertEquals(digest, await hashReviewToken("raw-secret-token"));
});

Deno.test("hashes reviewed content deterministically", async () => {
  assertEquals(
    await hashReviewContent("headline\narticle"),
    await hashReviewContent("headline\narticle"),
  );
});

Deno.test("treats an expiry equal to now as expired", () => {
  const now = new Date("2026-08-22T12:00:00.000Z");

  assertEquals(isExpired("2026-08-22T12:00:00.000Z", now), true);
  assertEquals(isExpired("2026-08-22T12:00:01.000Z", now), false);
});

Deno.test("identifies only reviewable or publishable versions as active", () => {
  assertEquals(isActiveVersion("pending_review"), true);
  assertEquals(isActiveVersion("approved"), true);
  assertEquals(isActiveVersion("publishing"), true);
  assertEquals(isActiveVersion("verification_failed"), true);
  assertEquals(isActiveVersion("changes_requested"), false);
  assertEquals(isActiveVersion("superseded"), false);
  assertEquals(isActiveVersion("published"), false);
  assertEquals(isActiveVersion("expired"), false);
});

Deno.test("selects an initial approval only for an exact pending snapshot", () => {
  assertEquals(
    getApprovalDisposition(
      { status: "pending_review", version: 3, contentHash: "abc" },
      { version: 3, contentHash: "abc" },
    ),
    "approve",
  );
  assertEquals(
    getApprovalDisposition(
      { status: "pending_review", version: 3, contentHash: "abc" },
      { version: 2, contentHash: "abc" },
    ),
    "conflict",
  );
});

Deno.test("treats a matching approved snapshot as an idempotent approval", () => {
  assertEquals(
    getApprovalDisposition(
      { status: "approved", version: 3, contentHash: "abc" },
      { version: 3, contentHash: "abc" },
    ),
    "already_approved",
  );
  assertEquals(
    getApprovalDisposition(
      { status: "approved", version: 3, contentHash: "abc" },
      { version: 3, contentHash: "different" },
    ),
    "conflict",
  );
});
