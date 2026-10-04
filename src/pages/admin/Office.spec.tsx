import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { OfficeData } from "@/hooks/useOffice";
import type { OfficeCall } from "@/lib/office";

// The page is driven entirely by these two hooks, so the spec controls them and
// asserts on what the page SENDS. A real Supabase call here would need an admin
// session, and the access rule is the one thing this spec cannot prove.
const mutate = vi.fn();
const refetch = vi.fn();
let officeState: { data?: OfficeData; error: unknown; isLoading: boolean; isFetching: boolean };

vi.mock("@/hooks/useOffice", () => ({
  useOffice: () => ({ ...officeState, refetch }),
  useSendOfficeMessage: () => ({ mutate }),
}));

import Office from "./Office";

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60000).toISOString();

function officeData(): OfficeData {
  return {
    updatedAt: iso(2),
    messages: [],
    snapshot: {
      outbrief: {
        date: "2026-10-01",
        decisions: [
          { n: 4, title: "Authorize the music pipeline fixes", tag: "NEW", recommendation: "Approve both.", deadline: "Today", source: "", answer: "" },
          { n: 9, title: "Call DLA about the CAGE code", tag: "", recommendation: "", deadline: "", source: "", answer: "resolved" },
        ],
        stuck: ["LinkedIn has not posted since 2026-09-18."],
      },
      team: [
        { name: "finance-officer", does: "Monthly close.", doing: "", queued: 1, held: 0, blocked: 0, done_7d: 0, last_done: "", last_done_at: null, lessons: 0 },
      ],
      jobs: [
        { id: "2026-10-01-coo-held-job", title: "NOS coastal geospatial fit check", status: "held", detail: "", assignee: "bd-contracts-officer", deadline: "9999-12-31", updated: iso(30) },
        { id: "2026-10-01-adam-blocked-job", title: "Send the drip emails", status: "blocked", detail: "Verify the sending domain in Resend", assignee: "", deadline: "", updated: iso(60) },
      ],
      dispatcher: { running: false, last_pass_at: "18:20", last_pass_day: "2026-10-01", last_outcome: "0 done, 1 failed" },
      automations: { checked_at: iso(3), overall: "RED", results: [
        { name: "n8n-liveness", level: "OK", message: "pinged", last_run: iso(5), last_success: iso(5) },
        { name: "daily-music", level: "RED", message: "exited with code 1", last_run: iso(60), last_success: null },
      ] },
      activity: [{ at: iso(20), text: "dispatcher: 0 done, 1 failed" }],
    },
  };
}

// No jest-dom in this repo: getBy* already throws when the element is missing,
// and `disabled` is read straight off the button.
const disabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled;

const renderOffice = () => render(<MemoryRouter><Office /></MemoryRouter>);

// vitest runs without globals here, so RTL does not clean up on its own.
afterEach(cleanup);

beforeEach(() => {
  mutate.mockReset();
  refetch.mockReset();
  officeState = { data: officeData(), error: null, isLoading: false, isFetching: false };
});

describe("Office page", () => {
  it("sends Yes as an answer to the right Outbrief item and date", () => {
    renderOffice();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "answer", body: "yes", digestDate: "2026-10-01", item: 4 });
  });

  it("sends an answer in Adam's own words, trimmed, and not an empty one", () => {
    renderOffice();
    const send = screen.getByRole("button", { name: "Send" });
    expect(disabled(send)).toBe(true);
    fireEvent.change(screen.getByLabelText("Your answer to decision 4"), { target: { value: "  yes, but only the health gate  " } });
    fireEvent.click(send);
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "answer", body: "yes, but only the health gate", digestDate: "2026-10-01", item: 4 });
  });

  it("locks the decision's buttons after one tap so the answer cannot be sent twice", () => {
    renderOffice();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(disabled(screen.getByRole("button", { name: "Yes" }))).toBe(true);
    expect(disabled(screen.getByRole("button", { name: "No" }))).toBe(true);
  });

  it("shows an answered decision under Answered, with no Yes or No on it", () => {
    renderOffice();
    expect(screen.getAllByRole("button", { name: "Yes" })).toHaveLength(1);
    expect(screen.getByText("Answered (1)")).toBeTruthy();
    expect(screen.getByText("resolved")).toBeTruthy();
  });

  it("sends a directive to the COO", () => {
    renderOffice();
    fireEvent.change(screen.getByLabelText("Message to the COO"), { target: { value: "Find out why LinkedIn stopped posting." } });
    fireEvent.click(screen.getByRole("button", { name: "Send to the COO" }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "directive", body: "Find out why LinkedIn stopped posting." });
  });

  it("releases a held job by its exact id, and offers no Release on a blocked job", () => {
    renderOffice();
    const releases = screen.getAllByRole("button", { name: "Release to run" });
    expect(releases).toHaveLength(1);
    fireEvent.click(releases[0]);
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "release", body: "2026-10-01-coo-held-job" });
    expect(screen.getByText("Verify the sending domain in Resend")).toBeTruthy();
  });

  it("shows Release sent, disabled, once a release for that job is in the message list", () => {
    officeState.data!.messages = [{
      id: "r1", created_at: iso(1), kind: "release", digest_date: null, item: null,
      body: "2026-10-01-coo-held-job", picked_up_at: null, ledger_line: null,
    }];
    renderOffice();
    expect(disabled(screen.getByRole("button", { name: "Release sent" }))).toBe(true);
    expect(screen.queryByRole("button", { name: "Release to run" })).toBeNull();
  });

  it("lists the failing automation before the healthy one", () => {
    renderOffice();
    const section = screen.getByRole("heading", { name: "Automations" }).closest("section")!;
    const names = within(section).getAllByText(/^(daily-music|n8n-liveness)$/).map((n) => n.textContent);
    expect(names).toEqual(["daily-music", "n8n-liveness"]);
  });

  it("says access is not turned on, with no retry, when the database refuses the read", () => {
    officeState = { data: undefined, error: { code: "42501", message: "permission denied for table office_snapshot" }, isLoading: false, isFetching: false };
    renderOffice();
    expect(screen.getByText("Office access is not turned on yet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Yes" })).toBeNull();
  });

  it("offers a retry on any other failure", () => {
    officeState = { data: undefined, error: new Error("Failed to fetch"), isLoading: false, isFetching: false };
    renderOffice();
    expect(screen.getByText("Couldn't load the office")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("keeps the last good status on screen when a later refresh fails", () => {
    officeState.error = new Error("Failed to fetch");
    renderOffice();
    expect(screen.getByText(/Could not refresh just now/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Yes" })).toBeTruthy();
    expect(screen.queryByText("Couldn't load the office")).toBeNull();
  });

  it("says the office has not reported instead of rendering an empty board", () => {
    officeState.data = { snapshot: null, updatedAt: null, messages: [] };
    renderOffice();
    expect(screen.getByText("The office has not reported yet")).toBeTruthy();
  });
});

// Added 2026-10-03: every matter blocked on Adam is a call, live from the queue.
// 2026-10-04: a question he asks on a call gets an answer; see the last describe.
const blockedCall = (over: Partial<OfficeCall> = {}): OfficeCall => ({
  id: "2026-10-03-adam-copy-part2", title: "Marketing copy build, part 2",
  needs: "Decide on pavement: (a) rewrite the copy, or (b) publish as staged.", held: false,
  assignee: "engineering-devops-automator", since: iso(120), sheet: "agent-office/operations/copy-sheet.md",
  decision: null, unblocks: 3, earlier: [], reply: null, ...over,
});

describe("Office page: calls blocked on Adam", () => {
  it("lists a blocked job under Your calls and counts it with the open decision", () => {
    officeState.data!.snapshot!.calls = [blockedCall()];
    renderOffice();
    expect(screen.getByText("Marketing copy build, part 2")).toBeTruthy();
    expect(screen.getByText(/3 jobs wait behind this/)).toBeTruthy();
    expect(screen.getByText("calls waiting on you").previousElementSibling?.textContent).toBe("2");
  });

  it("sends Mark as done as a reply that names the job", () => {
    officeState.data!.snapshot!.calls = [blockedCall()];
    renderOffice();
    fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "directive", body: "RE job 2026-10-03-adam-copy-part2: done" });
    expect(disabled(screen.getByRole("button", { name: "Mark as done" }))).toBe(true);
  });

  it("sends a reply in Adam's own words, trimmed, and not an empty one", () => {
    officeState.data!.snapshot!.calls = [blockedCall()];
    renderOffice();
    const send = screen.getByRole("button", { name: "Send reply" });
    expect(disabled(send)).toBe(true);
    fireEvent.change(screen.getByLabelText("Your reply on Marketing copy build, part 2"), { target: { value: "  a, rewrite it  " } });
    fireEvent.click(send);
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "directive", body: "RE job 2026-10-03-adam-copy-part2: a, rewrite it" });
  });

  it("does not ask twice: a call whose decision is still open is left to that decision", () => {
    officeState.data!.snapshot!.calls = [blockedCall({ decision: 4 })];
    renderOffice();
    expect(screen.queryByRole("button", { name: "Mark as done" })).toBeNull();
    expect(screen.getByRole("button", { name: "Yes" })).toBeTruthy();
  });

  it("moves a replied call to Answered, with no reply box on it", () => {
    officeState.data!.snapshot!.calls = [blockedCall({ reply: { text: "a, rewrite it", at: iso(5), job: "2026-10-03-adam-copy-part2" } })];
    renderOffice();
    expect(screen.queryByRole("button", { name: "Mark as done" })).toBeNull();
    expect(screen.getByText("Answered (2)")).toBeTruthy();
    expect(screen.getByText("a, rewrite it")).toBeTruthy();
  });

  it("releases a held call by its exact id", () => {
    officeState.data!.snapshot!.calls = [blockedCall({ id: "2026-10-01-coo-held-job", held: true, needs: "held for Adam" })];
    renderOffice();
    fireEvent.click(screen.getByRole("button", { name: "Release this job" }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "release", body: "2026-10-01-coo-held-job" });
  });

  it("still renders when the snapshot comes from a sync that has no calls yet", () => {
    renderOffice();
    expect(screen.getByText("call waiting on you").previousElementSibling?.textContent).toBe("1");
  });
});

// Added 2026-10-04: a question gets an answer, and the call stays open.
describe("Office page: questions and answers", () => {
  const asked = [{
    q: "why are we worried about July?",
    a: "July is the label on the copy batch. The job still needs your pavement decision.",
    by: "COO",
    at: iso(3),
  }];

  it("shows the office's answer on the call and leaves the call open for his reply", () => {
    officeState.data!.snapshot!.calls = [blockedCall({ asked })];
    officeState.data!.messages = [{
      id: "q1", created_at: iso(8), kind: "directive", digest_date: null, item: null,
      body: "RE job 2026-10-03-adam-copy-part2: why are we worried about July?", picked_up_at: iso(7), ledger_line: null,
    }];
    renderOffice();
    expect(screen.getByText("why are we worried about July?")).toBeTruthy();
    expect(screen.getByText(/July is the label on the copy batch/)).toBeTruthy();
    expect(screen.getByText("COO answered:", { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mark as done" })).toBeTruthy();
    expect(screen.getByText("calls waiting on you").previousElementSibling?.textContent).toBe("2");
  });

  it("says a question is being answered, not that the call was answered", () => {
    officeState.data!.snapshot!.calls = [
      blockedCall({ reply: { text: "why are we worried about July?", at: iso(2), job: "2026-10-03-adam-copy-part2" } }),
    ];
    renderOffice();
    expect(screen.getByText("You asked:", { exact: false })).toBeTruthy();
    expect(screen.getByText(/This call comes back with the answer/)).toBeTruthy();
    expect(screen.queryByText("You replied:", { exact: false })).toBeNull();
  });

  it("lists answers to questions that were not about a call, naming the employee who answered", () => {
    officeState.data!.snapshot!.answers = [
      { q: "what did we bill in September?", a: "Nothing is on file for September.", by: "finance-officer", at: iso(10) },
    ];
    renderOffice();
    expect(screen.getByText("Answers from the office")).toBeTruthy();
    expect(screen.getByText("what did we bill in September?")).toBeTruthy();
    expect(screen.getByText("Finance answered:", { exact: false })).toBeTruthy();
  });

  it("shows no answers heading when there are none", () => {
    renderOffice();
    expect(screen.queryByText("Answers from the office")).toBeNull();
  });
});
