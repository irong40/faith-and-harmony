import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { OfficeData } from "@/hooks/useOffice";
import type { OfficeCall, OfficePresence, OfficePresenceEvent } from "@/lib/office";

// The page is driven entirely by these two hooks, so the spec controls them and
// asserts on what the page SENDS. A real Supabase call here would need an admin
// session, and the access rule is the one thing this spec cannot prove.
const mutate = vi.fn();
const refetch = vi.fn();
let officeState: { data?: OfficeData; error: unknown; isLoading: boolean; isFetching: boolean };
let presenceState: { data?: { presence: OfficePresence[]; events: OfficePresenceEvent[] }; error: unknown; dataUpdatedAt?: number };

vi.mock("@/hooks/useOffice", () => ({
  useOffice: () => ({ ...officeState, refetch }),
  useOfficePresence: () => presenceState,
  // mutateAsync records into the same spy, so assertions on mutate cover both paths.
  useSendOfficeMessage: () => ({ mutate, mutateAsync: async (x: unknown) => { mutate(x); return x; } }),
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

const renderOffice = (view?: string) =>
  render(<MemoryRouter initialEntries={[view ? `/admin/office?view=${view}` : "/admin/office"]}><Office /></MemoryRouter>);

/** Pick an item in the inbox queue so its controls show in the detail pane. */
const openItem = (title: string) =>
  fireEvent.click(within(screen.getByRole("list", { name: "Items that need you" })).getByText(title));

const showView = (name: string) => fireEvent.click(screen.getByRole("tab", { name: new RegExp(`^${name}`) }));

// vitest runs without globals here, so RTL does not clean up on its own.
afterEach(cleanup);

beforeEach(() => {
  mutate.mockReset();
  refetch.mockReset();
  officeState = { data: officeData(), error: null, isLoading: false, isFetching: false };
  presenceState = { data: { presence: [], events: [] }, error: null };
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
    showView("Work board");
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
    renderOffice("board");
    expect(disabled(screen.getByRole("button", { name: "Release sent" }))).toBe(true);
    expect(screen.queryByRole("button", { name: "Release to run" })).toBeNull();
  });

  it("lists the failing automation before the healthy one", () => {
    renderOffice("health");
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
    openItem("Marketing copy build, part 2");
    expect(screen.getAllByText("Marketing copy build, part 2").length).toBeGreaterThan(0);
    expect(screen.getByText(/3 jobs wait behind this/)).toBeTruthy();
    expect(screen.getByText("calls waiting on you").previousElementSibling?.textContent).toBe("2");
  });

  it("sends Mark as done as a reply that names the job", () => {
    officeState.data!.snapshot!.calls = [blockedCall()];
    renderOffice();
    openItem("Marketing copy build, part 2");
    fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "directive", body: "RE job 2026-10-03-adam-copy-part2: done" });
    expect(disabled(screen.getByRole("button", { name: "Mark as done" }))).toBe(true);
  });

  it("sends a reply in Adam's own words, trimmed, and not an empty one", () => {
    officeState.data!.snapshot!.calls = [blockedCall()];
    renderOffice();
    openItem("Marketing copy build, part 2");
    const send = screen.getByRole("button", { name: "Send reply" });
    expect(disabled(send)).toBe(true);
    fireEvent.change(screen.getByLabelText("Your reply on Marketing copy build, part 2"), { target: { value: "  a, rewrite it  " } });
    fireEvent.click(send);
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "directive", body: "RE job 2026-10-03-adam-copy-part2: a, rewrite it" });
  });

  it("shows the plain card first and sends a clicked answer as the reply (2026-11-05)", () => {
    officeState.data!.snapshot!.calls = [blockedCall({
      card: {
        ask: "Should the corrected post go out Friday?",
        why: "It cannot be scheduled until you answer.",
        recommend: "Yes, the fix passed the source check.",
        kind: "decision",
        steps: [],
        options: [
          { label: "Yes, post Friday", reply: "Yes, schedule the corrected post for Friday." },
          { label: "Hold it", reply: "Hold the corrected post until I look at it." },
        ],
        needs_text: false,
      },
    })];
    renderOffice();
    openItem("Should the corrected post go out Friday?");
    expect(screen.getByText("Yes, the fix passed the source check.")).toBeTruthy();
    expect(screen.getByText("Details (what the agent wrote)")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mark as done" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hold it" }));
    expect(mutate.mock.calls[0][0]).toEqual({
      kind: "directive",
      body: "RE job 2026-10-03-adam-copy-part2: Hold the corrected post until I look at it.",
    });
    expect(disabled(screen.getByRole("button", { name: "Yes, post Friday" }))).toBe(true);
  });

  it("shows the steps for a card that needs Adam to act, and still takes typed text", () => {
    officeState.data!.snapshot!.calls = [blockedCall({
      card: {
        ask: "Sign in to NotebookLM so the quiz refill can run.",
        why: "The refill stops until the sign-in is saved.",
        recommend: "Sign in now; it takes a minute.",
        kind: "action",
        steps: ["Open the NotebookLM window", "Sign in with your Google account"],
        options: [
          { label: "Done, I signed in", reply: "I signed in to NotebookLM. Run the refill." },
          { label: "Not now", reply: "I cannot sign in now. Ask me tomorrow." },
        ],
        needs_text: false,
      },
    })];
    renderOffice();
    openItem("Sign in to NotebookLM so the quiz refill can run.");
    expect(screen.getByText("Sign in with your Google account")).toBeTruthy();
    expect(screen.getByText("Your step")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Your answer: Sign in to NotebookLM so the quiz refill can run."), { target: { value: " which account? " } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "directive", body: "RE job 2026-10-03-adam-copy-part2: which account?" });
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
    openItem("Marketing copy build, part 2");
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
    openItem("Marketing copy build, part 2");
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

describe("Office marketplace jobs", () => {
  const m = (id: string, over: Record<string, unknown> = {}) => ({
    id, name: `M ${id}`, city: "Chesapeake", state: "Virginia", miles: 5, acres: 20, capture: "10/23/26",
    due: "10/31/26", deviation: "", flyguys_airspace: "", airspace_level: "NONE",
    airspace_text: "No authorization needed (Class G)", lat: 36.7, lng: -76.2, status: "open",
    interest_at: null, outcome_subject: null, outcome_at: null, ...over,
  });

  it("sends interest for exactly the selected missions", () => {
    officeState.data!.snapshot!.marketplace = {
      status: "ok", missions: [m("167155"), m("172283", { airspace_level: "DRONEZONE" })],
    } as never;
    renderOffice("marketplace");
    expect(screen.getByText("Marketplace jobs")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Select airspace-clear" }));
    fireEvent.click(screen.getByRole("button", { name: /I'm interested \(1\)/ }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "interest", body: "167155" });
  });

  it("sends Not for me as a decline for the selected missions, in the interest body format", () => {
    officeState.data!.snapshot!.marketplace = { status: "ok", missions: [m("167155"), m("171386", { miles: 9 })] } as never;
    renderOffice("marketplace");
    fireEvent.click(screen.getByRole("checkbox", { name: "Select mission 167155" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select mission 171386" }));
    fireEvent.click(screen.getByRole("button", { name: "Not for me (2)" }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "decline", body: "167155,171386" });
  });

  it("declines one mission from its own row, even from a stale feed (nothing goes to FlyGuys)", () => {
    officeState.data!.snapshot!.marketplace = { status: "STALE: pull failed", missions: [m("167155")] } as never;
    renderOffice("marketplace");
    expect(disabled(screen.getByRole("button", { name: "I'm interested in mission 167155" }))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Not for me: mission 167155" }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "decline", body: "167155" });
  });

  it("moves a declined mission out of New and into Declined", () => {
    officeState.data!.snapshot!.marketplace = { status: "ok", missions: [m("167155"), m("171386")] } as never;
    officeState.data!.messages = [{
      id: "d1", created_at: iso(1), kind: "decline", digest_date: null, item: null,
      body: "167155", picked_up_at: null, ledger_line: null,
    }];
    renderOffice("marketplace");
    expect(screen.queryByRole("checkbox", { name: "Select mission 167155" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /^Declined/ }));
    expect(screen.getByText("167155")).toBeTruthy();
  });

  it("shows the full airspace screen text on every row, in every tab", () => {
    const text = "No authorization needed (Class G) (screen; re-check the real KML)";
    officeState.data!.snapshot!.marketplace = {
      status: "ok",
      missions: [m("167155", { airspace_text: text }), m("171386", { airspace_text: text, status: "interested" })],
    } as never;
    renderOffice("marketplace");
    expect(screen.getAllByText(text)).toHaveLength(1);
    fireEvent.click(screen.getByRole("tab", { name: /^Waiting on FlyGuys/ }));
    expect(screen.getAllByText(text)).toHaveLength(1);
  });

  it("shows the extra FlyGuys fields when the snapshot has them", () => {
    officeState.data!.snapshot!.marketplace = {
      status: "ok",
      missions: [m("167155", { deviation: "Capture review", deviation_detail: "Trees/Vegetation", mc: "B. Manuel", address: "3020", zip: "23321", mission_status: "Pilot Sourcing" })],
    } as never;
    renderOffice("marketplace");
    expect(screen.getByText("Trees/Vegetation")).toBeTruthy();
    expect(screen.getByText(/3020 23321 · B\. Manuel · Pilot Sourcing/)).toBeTruthy();
  });

  it("says UNKNOWN, not 'no missions', when the desktop could not read the feed", () => {
    officeState.data!.snapshot!.marketplace = { status: "UNKNOWN: DroneSniper mission file missing", missions: [] } as never;
    renderOffice("marketplace");
    expect(screen.getByText(/the desktop could not read the mission feed/)).toBeTruthy();
    // QA 2026-10-17: the empty state and "0 near you" must not also claim there are no missions.
    expect(screen.queryByText(/No open missions near you/)).toBeNull();
    expect(screen.queryByText(/0 near you/)).toBeNull();
    expect(screen.getByText(/missions unknown/)).toBeTruthy();
  });

  it("refuses to send interest from a stale feed", () => {
    officeState.data!.snapshot!.marketplace = {
      status: "STALE: the last 3 FlyGuys pull(s) failed", missions: [m("167155")],
    } as never;
    renderOffice("marketplace");
    expect(screen.getByText(/STALE: the last 3 FlyGuys pull/)).toBeTruthy();
    expect(disabled(screen.getByRole("button", { name: /^I'm interested( \(\d+\))?$/ }))).toBe(true);
    expect(disabled(screen.getByRole("button", { name: "Select airspace-clear" }))).toBe(true);
  });

  it("files a non-assignment FlyGuys email for review, not as an award", () => {
    officeState.data!.snapshot!.marketplace = {
      status: "ok", missions: [m("169545", { status: "mission_email", outcome_subject: "Mission update 169545", off_map: true })],
    } as never;
    renderOffice("marketplace");
    fireEvent.click(screen.getByRole("tab", { name: /^Needs attention/ }));
    expect(screen.getByText("Mission email: review")).toBeTruthy();
    expect(screen.getByText(/if it is an assignment, confirm/)).toBeTruthy();
    expect(screen.getByText(/No longer on the sourcing map/)).toBeTruthy();
    expect(screen.queryByText("Possible award")).toBeNull();
  });

  it("does not resend a selected mission that a refresh moved to Waiting", () => {
    officeState.data!.snapshot!.marketplace = { status: "ok", missions: [m("167155"), m("171386")] } as never;
    const view = renderOffice("marketplace");
    fireEvent.click(screen.getByRole("checkbox", { name: "Select mission 167155" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select mission 171386" }));
    officeState.data = {
      ...officeState.data!,
      snapshot: {
        ...officeState.data!.snapshot!,
        marketplace: { status: "ok", missions: [m("167155", { status: "interested" }), m("171386")] } as never,
      },
    };
    view.rerender(<MemoryRouter initialEntries={["/admin/office?view=marketplace"]}><Office /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /I'm interested \(1\)/ }));
    expect(mutate.mock.calls[0][0]).toEqual({ kind: "interest", body: "171386" });
  });

  it("puts a possible award in the inbox with the 24-hour warning", () => {
    officeState.data!.snapshot!.marketplace = {
      status: "ok", missions: [m("169545", { status: "possible_award", outcome_subject: "Mission 169545" })],
    } as never;
    renderOffice();
    openItem("FlyGuys 169545, Chesapeake: Possible award");
    expect(screen.getByText(/confirm within 24 hours/)).toBeTruthy();
  });
});

describe("Office views", () => {
  it("opens on the inbox and switches views from the toolbar", () => {
    renderOffice();
    expect(screen.getByRole("tab", { name: /^Inbox/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("heading", { name: "Automations" })).toBeNull();
    showView("Health");
    expect(screen.getByRole("heading", { name: "Automations" })).toBeTruthy();
    showView("Business");
    expect(screen.getByRole("heading", { name: "The business" })).toBeTruthy();
    showView("Inbox");
    expect(screen.getByRole("button", { name: "Yes" })).toBeTruthy();
  });

  it("filters the inbox by kind", () => {
    officeState.data!.snapshot!.calls = [blockedCall()];
    renderOffice();
    const list = () => screen.getByRole("list", { name: "Items that need you" });
    expect(within(list()).getAllByRole("button")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /^Calls/ }));
    expect(within(list()).getAllByRole("button")).toHaveLength(1);
    expect(within(list()).getByText("Marketing copy build, part 2")).toBeTruthy();
  });
});

describe("Office floor", () => {
  const working = (over: Partial<OfficePresence> = {}): OfficePresence => ({
    agent: "finance-officer", kind: "specialist", state: "working", source: "dispatcher",
    job_id: "2026-10-17-close", title: "September close", step: "Step 2: reconciling the AMEX statement",
    machine: "DESKTOP", started_at: iso(10), updated_at: iso(1), finished_at: null, outcome: null, ...over,
  });

  it("shows a working desk live, with its step, and opens its check-in timeline", () => {
    presenceState.data = {
      presence: [working()],
      events: [
        { id: 1, at: iso(10), agent: "finance-officer", event: "start", job_id: "2026-10-17-close", text: "September close" },
        { id: 2, at: iso(1), agent: "finance-officer", event: "step", job_id: "2026-10-17-close", text: "Step 2: reconciling the AMEX statement" },
      ],
    };
    renderOffice("floor");
    const desk = screen.getByRole("button", { name: "Finance: Working now" });
    expect(within(desk).getByText("September close")).toBeTruthy();
    fireEvent.click(desk);
    expect(screen.getByText("On the desk now")).toBeTruthy();
    expect(screen.getByText("Check-ins")).toBeTruthy();
    expect(screen.getAllByText(/reconciling the AMEX statement/).length).toBeGreaterThan(1);
  });

  it("puts a scheduled automation in its own room", () => {
    presenceState.data = {
      presence: [working({ agent: "security-audit", kind: "automation", source: "scheduler", title: "Nightly security audit" })],
      events: [],
    };
    renderOffice("floor");
    const room = screen.getByRole("region", { name: "Scheduled automations" });
    expect(within(room).getByText("security audit")).toBeTruthy();
  });

  it("says it shows cached check-ins when a refresh fails after a good read", () => {
    const readAt = new Date("2026-10-17T18:05:00Z");
    presenceState = {
      data: { presence: [working()], events: [] },
      error: new Error("socket closed"),
      dataUpdatedAt: readAt.getTime(),
    };
    renderOffice("floor");
    const banner = screen.getByRole("alert");
    expect(banner.textContent).toMatch(/Live updates are paused \(socket closed\)\. Showing check-ins as of /);
    expect(banner.textContent).not.toMatch(/snapshot/);
    // Row precedence unchanged: the cached live row still drives the desk.
    expect(screen.getByRole("button", { name: "Finance: Working now" })).toBeTruthy();
  });

  it("does not count a desk as working from a snapshot that stopped arriving", () => {
    presenceState = { data: undefined, error: new Error("socket closed") };
    officeState.data!.updatedAt = iso(7 * 24 * 60);
    officeState.data!.snapshot!.team = [
      { name: "finance-officer", does: "", doing: "September close", queued: 0, held: 0, blocked: 0, done_7d: 0, last_done: "", last_done_at: null, lessons: 0 },
    ];
    renderOffice("floor");
    expect(screen.getByRole("button", { name: /^Finance: May have stopped \(snapshot from 7 d ago\)/ })).toBeTruthy();
    expect(screen.getByText(/0 working now/)).toBeTruthy();
  });

  it("says live updates are paused and that desks show the 5-minute snapshot", () => {
    presenceState = { data: undefined, error: new Error("permission denied for table office_presence") };
    renderOffice("floor");
    expect(screen.getByText(/Live updates are paused/)).toBeTruthy();
    expect(screen.getByText(/Desks show the office snapshot, which\s+updates every 5 minutes/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Finance:/ })).toBeTruthy();
  });

  it("shows a dispatcher job from the snapshot when presence errored, not No work recorded", () => {
    presenceState = { data: undefined, error: new Error("socket closed") };
    officeState.data!.snapshot!.team = [
      { name: "finance-officer", does: "Monthly close.", doing: "September close", queued: 0, held: 0, blocked: 0, done_7d: 0, last_done: "", last_done_at: null, lessons: 0 },
    ];
    renderOffice("floor");
    const desk = screen.getByRole("button", { name: "Finance: Working (5-minute snapshot)" });
    expect(within(desk).getByText("September close")).toBeTruthy();
    fireEvent.click(desk);
    expect(screen.getByText(/From the 5-minute office snapshot/)).toBeTruthy();
  });

  it("shows a snapshot job when presence loaded but has no row for that desk", () => {
    presenceState = { data: { presence: [], events: [] }, error: null };
    officeState.data!.snapshot!.team = [
      { name: "finance-officer", does: "", doing: "September close", queued: 0, held: 0, blocked: 0, done_7d: 0, last_done: "", last_done_at: null, lessons: 0 },
    ];
    renderOffice("floor");
    expect(screen.getByRole("button", { name: "Finance: Working (5-minute snapshot)" })).toBeTruthy();
    expect(screen.queryByText("No work recorded")).toBeNull();
  });
});
