import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

import {
  approveSubstackReview,
  isApprovedReviewer,
  loadSubstackReview,
  parseReviewIntent,
  requestSubstackChanges,
  REVIEW_EMAIL,
  SubstackReviewError,
} from "./substackReview";

describe("Substack review helpers", () => {
  it("accepts only the exact approved reviewer after normalization", () => {
    expect(isApprovedReviewer(" DrAdamOPierce@GMAIL.com ")).toBe(true);
    expect(isApprovedReviewer("someone@example.com")).toBe(false);
    expect(isApprovedReviewer(null)).toBe(false);
    expect(REVIEW_EMAIL).toBe("dradamopierce@gmail.com");
  });

  it("accepts only safe review intents", () => {
    expect(parseReviewIntent("approve")).toBe("approve");
    expect(parseReviewIntent("changes")).toBe("changes");
    expect(parseReviewIntent("publish")).toBe(null);
    expect(parseReviewIntent(null)).toBe(null);
  });

  it("loads a review through the Edge Function", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { review: { id: "review-1" } },
      error: null,
    });

    await expect(loadSubstackReview("raw-token", invoke)).resolves.toEqual({
      id: "review-1",
    });
    expect(invoke).toHaveBeenCalledWith("substack-review", {
      body: { action: "load", token: "raw-token" },
    });
  });

  it("sends change request text as editorial data", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { status: "changes_requested" },
      error: null,
    });

    await requestSubstackChanges("raw-token", "Clarify the boundary.", invoke);
    expect(invoke).toHaveBeenCalledWith("substack-review", {
      body: {
        action: "request_changes",
        token: "raw-token",
        changes: "Clarify the boundary.",
      },
    });
  });

  it("adds the explicit confirmation flag to approval", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { status: "approved", idempotent: false },
      error: null,
    });

    await approveSubstackReview({
      token: "raw-token",
      version: 3,
      contentHash: "a".repeat(64),
    }, invoke);
    expect(invoke).toHaveBeenCalledWith("substack-review", {
      body: {
        action: "approve",
        token: "raw-token",
        version: 3,
        content_hash: "a".repeat(64),
        confirm_publish: true,
      },
    });
  });

  it.each([
    [401, "Sign in again to review this draft."],
    [403, "Use dradamopierce@gmail.com to review this draft."],
    [409, "This review version is no longer active."],
    [410, "This review link has expired."],
  ])("maps function status %s to a safe message", async (status, message) => {
    const invoke = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Function failed", context: { status } },
    });

    await expect(loadSubstackReview("raw-token", invoke)).rejects.toMatchObject({
      name: "SubstackReviewError",
      message,
      status,
    } satisfies Partial<SubstackReviewError>);
  });
});
