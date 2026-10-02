import { describe, expect, it } from "vitest";
import {
  ago,
  boardColumns,
  employeeState,
  freshness,
  isAccessNotGranted,
  messageStatus,
  releaseSent,
  roleOf,
  sortAutomations,
  splitDecisions,
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
