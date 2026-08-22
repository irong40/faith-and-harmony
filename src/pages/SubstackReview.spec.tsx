import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  authState: {
    user: null as null | { id: string; email?: string | null },
    loading: false,
  },
  signInWithOAuth: vi.fn(),
  loadReview: vi.fn(),
  requestChanges: vi.fn(),
  approveReview: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signInWithOAuth: mocks.signInWithOAuth },
  },
}));

vi.mock("@/lib/substackReview", () => ({
  REVIEW_EMAIL: "dradamopierce@gmail.com",
  isApprovedReviewer: (email: string | null | undefined) =>
    email?.trim().toLowerCase() === "dradamopierce@gmail.com",
  parseReviewIntent: (intent: string | null) =>
    intent === "approve" || intent === "changes" ? intent : null,
  loadSubstackReview: mocks.loadReview,
  requestSubstackChanges: mocks.requestChanges,
  approveSubstackReview: mocks.approveReview,
}));

import SubstackReview from "./SubstackReview";

const review = {
  id: "11111111-1111-4111-8111-111111111111",
  draft_id: "beach-airspace",
  version: 3,
  status: "pending_review",
  selected_headline: "The Drone Stayed on the Ground",
  subtitle: "What stopped the field test",
  article_markdown: "The full reviewed article.",
  notes_teaser: "A short note.",
  subscribe_call: "Subscribe for the next field report.",
  content_hash: "a".repeat(64),
  expires_at: "2026-08-24T12:00:00.000Z",
  requested_changes: null,
  published_url: null,
};

function renderPage(intent?: "approve" | "changes") {
  const query = intent ? `?intent=${intent}` : "";
  return render(
    <MemoryRouter initialEntries={[`/substack/review/raw-token${query}`]}>
      <Routes>
        <Route path="/substack/review/:token" element={<SubstackReview />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.authState.user = null;
  mocks.authState.loading = false;
  mocks.signInWithOAuth.mockReset().mockResolvedValue({ error: null });
  mocks.loadReview.mockReset().mockResolvedValue(review);
  mocks.requestChanges.mockReset().mockResolvedValue({
    status: "changes_requested",
  });
  mocks.approveReview.mockReset().mockResolvedValue({
    status: "approved",
    idempotent: false,
  });
});

afterEach(() => {
  cleanup();
});

describe("SubstackReview", () => {
  it("requires Google sign in before loading any draft content", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText("Private Substack review")).toBeTruthy();
    expect(screen.queryByText(review.selected_headline)).toBeNull();
    expect(mocks.loadReview).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /sign in with google/i }));
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringContaining("http://localhost"),
        queryParams: {
          login_hint: "dradamopierce@gmail.com",
          prompt: "select_account",
        },
      },
    });
  });

  it("rejects the wrong Google account without loading content", () => {
    mocks.authState.user = { id: "user-2", email: "someone@example.com" };
    renderPage();

    expect(screen.getByText(/use dradamopierce@gmail.com/i)).toBeTruthy();
    expect(mocks.loadReview).not.toHaveBeenCalled();
    expect(screen.queryByText(review.selected_headline)).toBeNull();
  });

  it("loads the reviewed snapshot without mutating it", async () => {
    mocks.authState.user = {
      id: "user-1",
      email: "dradamopierce@gmail.com",
    };
    renderPage("approve");

    expect(await screen.findByText(review.selected_headline)).toBeTruthy();
    expect(screen.getByText(review.article_markdown)).toBeTruthy();
    expect(screen.getByText(/Version 3$/)).toBeTruthy();
    expect(mocks.loadReview).toHaveBeenCalledWith("raw-token");
    expect(mocks.requestChanges).not.toHaveBeenCalled();
    expect(mocks.approveReview).not.toHaveBeenCalled();
  });

  it("submits a change request as editorial text", async () => {
    const user = userEvent.setup();
    mocks.authState.user = {
      id: "user-1",
      email: "dradamopierce@gmail.com",
    };
    renderPage("changes");

    const textArea = await screen.findByLabelText("Requested changes");
    await user.type(textArea, "Clarify the wildlife refuge boundary.");
    await user.click(screen.getByRole("button", { name: "Send Change Request" }));

    await waitFor(() => {
      expect(mocks.requestChanges).toHaveBeenCalledWith(
        "raw-token",
        "Clarify the wildlife refuge boundary.",
      );
    });
    expect(await screen.findByText("Changes requested")).toBeTruthy();
  });

  it("requires a separate confirmation before approval", async () => {
    const user = userEvent.setup();
    mocks.authState.user = {
      id: "user-1",
      email: "dradamopierce@gmail.com",
    };
    renderPage("approve");

    await user.click(await screen.findByRole("button", { name: "Approve and Publish" }));
    expect(mocks.approveReview).not.toHaveBeenCalled();
    expect(screen.getByText(/emails all substack subscribers immediately/i)).toBeTruthy();
    expect(screen.getByText(/aaaaaaaaaaaa/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Confirm Publish" }));
    await waitFor(() => {
      expect(mocks.approveReview).toHaveBeenCalledWith({
        token: "raw-token",
        version: 3,
        contentHash: "a".repeat(64),
      });
    });
    expect(await screen.findByText("Approved and queued")).toBeTruthy();
  });

  it("shows the verified public link after publication", async () => {
    mocks.authState.user = {
      id: "user-1",
      email: "dradamopierce@gmail.com",
    };
    mocks.loadReview.mockResolvedValue({
      ...review,
      status: "published",
      published_url: "https://dradamopierce.substack.com/p/live-post",
    });
    renderPage();

    const link = await screen.findByRole("link", { name: "Open live post" });
    expect(link.getAttribute("href")).toBe(
      "https://dradamopierce.substack.com/p/live-post",
    );
  });

  it("shows a safe load error without revealing content", async () => {
    mocks.authState.user = {
      id: "user-1",
      email: "dradamopierce@gmail.com",
    };
    mocks.loadReview.mockRejectedValue(new Error("This review link has expired."));
    renderPage();

    expect(await screen.findByText("This review link has expired.")).toBeTruthy();
    expect(screen.queryByText(review.article_markdown)).toBeNull();
  });
});
