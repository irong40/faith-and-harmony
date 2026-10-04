import { describe, expect, it } from "vitest";
import {
  ago,
  boardColumns,
  callMeta,
  employeeState,
  freshness,
  isAccessNotGranted,
  messageLabel,
  messageStatus,
  pendingReply,
  releaseSent,
  replyBody,
  replyText,
  roleOf,
  sortAutomations,
  splitCalls,
  splitDecisions,
  type OfficeCall,
  type OfficeDecision,
  type OfficeJob,
  type OfficeMessage,
} from "./office";

const NOW = new Date("2026-10-01T22:00:00Z").getTime();
const minsAgo = (m: number) => new Date(NOW - m * 60000).toISOString();

const decision = (n: number, answer = ""): OfficeDecision => ({
  n, title: `Decision ${n}`, tag: "", recommendation: "", deadline: "", source: "", answer,
});

const message = (over: Partial<OfficeMessage>): OfficeMessage => ({
  id: "m1", created_at: minsAgo(1), kind: "answer", digest_date: "2026-10-01", item: 1,
  body: "yes", picked_up_at: null, ledger_line: null, ...over,
});

const job = (id: string, status: string, updated: string | null = null): OfficeJob => ({
  id, title: id, status, detail: "", assignee: "", deadline: "", updated,
});

describe("ago", () => {
  it("never throws on a missing or bad date", () => {
    expect(ago(null, NOW)).toBe("never");
    expect(ago("not a date", NOW)).toBe("unknown");
  });
  it("scales from minutes to days", () => {
    expect(ago(minsAgo(0), NOW)).toBe("just now");
    expect(ago(minsAgo(7), NOW)).toBe("7 min ago");
    expect(ago(minsAgo(180), NOW)).toBe("3 h ago");
    expect(ago(minsAgo(60 * 24 * 4), NOW)).toBe("4 d ago");
  });
});

describe("freshness", () => {
  it("is live for one missed 5-minute push, then warns, then says the desktop is off", () => {
    expect(freshness(minsAgo(11), NOW).tone).toBe("good");
    expect(freshness(minsAgo(13), NOW).tone).toBe("warn");
    expect(freshness(minsAgo(91), NOW).tone).toBe("crit");
    expect(freshness(minsAgo(91), NOW).text).toMatch(/desktop may be off/);
  });
  it("does not claim to be live before the first push", () => {
    expect(freshness(null, NOW)).toEqual({ tone: "idle", text: "Waiting for the first status" });
  });
});

describe("splitDecisions", () => {
  it("closes a decision the ledger has answered", () => {
    const { open, closed } = splitDecisions([decision(1, "yes"), decision(2)], "2026-10-01", []);
    expect(open.map((d) => d.n)).toEqual([2]);
    expect(closed.map((d) => d.n)).toEqual([1]);
  });
  // The bug this prevents: a tapped Yes stays "open" until the next desktop
  // sync, so the same answer gets sent twice.
  it("closes a decision as soon as an answer is SENT, before the office collects it", () => {
    const sent = message({ item: 2, picked_up_at: null });
    const { open, closed } = splitDecisions([decision(1), decision(2)], "2026-10-01", [sent]);
    expect(open.map((d) => d.n)).toEqual([1]);
    expect(closed.map((d) => d.n)).toEqual([2]);
  });
  it("does not let an answer to another day's Outbrief close today's item", () => {
    const old = message({ item: 1, digest_date: "2026-09-30" });
    expect(splitDecisions([decision(1)], "2026-10-01", [old]).open).toHaveLength(1);
  });
  it("does not let a directive or release count as an answer", () => {
    const directive = message({ kind: "directive", item: 1 });
    expect(splitDecisions([decision(1)], "2026-10-01", [directive]).open).toHaveLength(1);
  });
});

describe("boardColumns", () => {
  it("puts held and blocked jobs in Waiting on you and sorts newest first", () => {
    const cols = boardColumns([
      job("a", "queued"), job("b", "held", "2026-10-01T10:00:00Z"), job("c", "blocked", "2026-10-01T12:00:00Z"),
      job("d", "in-progress"), job("e", "done"), job("f", "mystery"),
    ]);
    const byKey = Object.fromEntries(cols.map((c) => [c.key, c.jobs.map((j) => j.id)]));
    expect(byKey).toEqual({ todo: ["a"], doing: ["d"], waiting: ["c", "b"], done: ["e"] });
  });
});

describe("releaseSent", () => {
  it("is true only for a release of that exact job", () => {
    const msgs = [message({ kind: "release", body: "2026-10-01-coo-x", item: null, digest_date: null })];
    expect(releaseSent(msgs, "2026-10-01-coo-x")).toBe(true);
    expect(releaseSent(msgs, "2026-10-01-coo-y")).toBe(false);
    expect(releaseSent([message({ kind: "directive", body: "2026-10-01-coo-x" })], "2026-10-01-coo-x")).toBe(false);
  });
});

describe("messageStatus", () => {
  it("surfaces a refusal from the office instead of calling it received", () => {
    const refused = message({ picked_up_at: minsAgo(2), ledger_line: "REFUSED release: not a job id" });
    expect(messageStatus(refused, NOW)).toEqual({ tone: "crit", text: "REFUSED release: not a job id" });
  });
  it("distinguishes sent from received", () => {
    expect(messageStatus(message({}), NOW).text).toMatch(/collects it within 5 minutes/);
    expect(messageStatus(message({ picked_up_at: minsAgo(3) }), NOW).text).toBe("Received by the office 3 min ago");
  });
});

describe("employeeState", () => {
  const base = { name: "x", does: "", doing: "", queued: 0, held: 0, blocked: 0, done_7d: 0, last_done: "", last_done_at: null, lessons: 0 };
  it("ranks working over queued over held over blocked over idle", () => {
    expect(employeeState({ ...base, doing: "job", queued: 2 }).label).toBe("Working");
    expect(employeeState({ ...base, queued: 2, held: 1 }).label).toBe("Up next");
    expect(employeeState({ ...base, held: 1, blocked: 1 }).label).toBe("Held");
    expect(employeeState({ ...base, blocked: 1 }).label).toBe("Blocked");
    expect(employeeState(base).label).toBe("Idle");
  });
});

describe("roleOf", () => {
  it("falls back to the raw name for an employee hired after this page shipped", () => {
    expect(roleOf("finance-officer")).toEqual(["FIN", "Finance"]);
    expect(roleOf("new-hire-agent")).toEqual(["NEW-H", "new-hire-agent"]);
  });
});

describe("sortAutomations", () => {
  it("lists failing first, unknown levels last, and does not mutate its input", () => {
    const input = ["OK", "RED", "ODD", "WARN"].map((level) => ({ name: level, level, message: "", last_run: null, last_success: null }));
    expect(sortAutomations(input).map((a) => a.level)).toEqual(["RED", "WARN", "OK", "ODD"]);
    expect(input.map((a) => a.level)).toEqual(["OK", "RED", "ODD", "WARN"]);
  });
});

describe("isAccessNotGranted", () => {
  it("recognises the Postgres no-grant error and nothing else", () => {
    expect(isAccessNotGranted({ code: "42501", message: "permission denied for table office_snapshot" })).toBe(true);
    expect(isAccessNotGranted({ message: "permission denied for table office_inbox" })).toBe(true);
    expect(isAccessNotGranted({ code: "PGRST116", message: "JSON object requested, multiple rows returned" })).toBe(false);
    expect(isAccessNotGranted(new Error("Failed to fetch"))).toBe(false);
    expect(isAccessNotGranted(null)).toBe(false);
  });
});

const call = (over: Partial<OfficeCall> = {}): OfficeCall => ({
  id: "2026-10-03-adam-copy-part2", title: "Marketing copy, part 2", needs: "Decide a or b", held: false,
  assignee: "", since: minsAgo(120), sheet: "", decision: null, unblocks: 0, earlier: [], reply: null, ...over,
});

describe("calls", () => {
  it("a blocked job with no reply is open", () => {
    expect(splitCalls([call()], [], []).open).toHaveLength(1);
  });

  it("leaves out a call whose Outbrief decision is still open, so one matter asks once", () => {
    const c = call({ decision: 4 });
    expect(splitCalls([c], [decision(4)], [])).toEqual({ open: [], answered: [] });
    expect(splitCalls([c], [decision(7)], []).open).toEqual([c]); // #4 is answered: the follow-up shows
  });

  it("is answered once the office has recorded the reply", () => {
    const c = call({ reply: { text: "a", at: minsAgo(5), job: "2026-10-03-adam-copy-part2" } });
    expect(splitCalls([c], [], []).answered).toEqual([c]);
    expect(replyText(c, null)).toBe("a");
  });

  it("is answered the moment a reply is sent, before the office collects it", () => {
    const sent = message({ kind: "directive", digest_date: null, item: null, body: replyBody("2026-10-03-adam-copy-part2", " go with a "), created_at: minsAgo(1) });
    expect(sent.body).toBe("RE job 2026-10-03-adam-copy-part2: go with a");
    expect(splitCalls([call()], [], [sent]).answered).toHaveLength(1);
    expect(replyText(call(), sent)).toBe("go with a");
    expect(messageLabel(sent)).toBe("Reply on a call");
  });

  it("does not count a reply sent before the job last changed: that ask is gone", () => {
    const old = message({ kind: "directive", body: replyBody("2026-10-03-adam-copy-part2", "a"), created_at: minsAgo(300) });
    expect(pendingReply([old], call())).toBeNull();
  });

  it("counts a reply to an earlier job in the same matter", () => {
    const c = call({ earlier: [{ id: "2026-07-25-old-job", title: "Old", needs: "", since: null }] });
    const sent = message({ kind: "directive", body: replyBody("2026-07-25-old-job", "done"), created_at: minsAgo(1) });
    expect(pendingReply([sent], c)).toBe(sent);
  });

  it("does not mistake an ordinary directive, or a reply to another job, for a reply", () => {
    const other = message({ kind: "directive", body: replyBody("2026-10-03-adam-something-else", "done") });
    const plain = message({ kind: "directive", body: "Find out why LinkedIn stopped posting." });
    expect(pendingReply([other, plain], call())).toBeNull();
    expect(messageLabel(plain)).toBe("To the COO");
  });

  it("a Release answers a held call and nothing else", () => {
    const rel = message({ kind: "release", body: "2026-10-03-adam-copy-part2" });
    expect(pendingReply([rel], call({ held: true }))).toBe(rel);
    expect(replyText(call({ held: true }), rel)).toBe("Released to run");
    expect(pendingReply([rel], call())).toBeNull();
  });

  it("says how long, what waits behind it, and which decision it follows", () => {
    expect(callMeta(call({ unblocks: 3, decision: 10 }), NOW)).toBe("blocked 2 h ago · 3 jobs wait behind this · follows decision #10");
    expect(callMeta(call({ held: true, unblocks: 1 }), NOW)).toBe("held 2 h ago · 1 job waits behind this");
  });
});
