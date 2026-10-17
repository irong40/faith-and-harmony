import { describe, expect, it } from "vitest";
import {
  applyPresenceChange,
  buildInbox,
  declinePending,
  notDeclinedIds,
  deskState,
  deskTimeline,
  floorRooms,
  initials,
  missionPending,
  missionTabs,
  splitMissions,
  STALE_WORKING_MS,
  type OfficeCall,
  type OfficeDecision,
  type OfficeEmployee,
  type OfficeMessage,
  type OfficeMission,
  type OfficePresence,
  type OfficePresenceEvent,
} from "./office";

const NOW = new Date("2026-10-17T18:20:00Z").getTime();
const at = (minsAgo: number) => new Date(NOW - minsAgo * 60000).toISOString();

const mission = (id: string, over: Partial<OfficeMission> = {}): OfficeMission => ({
  id, name: `M ${id}`, city: "Chesapeake", state: "Virginia", miles: 5, acres: 20, capture: "10/23/26",
  due: "10/31/26", deviation: "", flyguys_airspace: "", airspace_level: "NONE", airspace_text: "",
  lat: 36.7, lng: -76.2, status: "open", interest_at: null, outcome_subject: null, outcome_at: null, ...over,
});

const msg = (kind: OfficeMessage["kind"], body: string, over: Partial<OfficeMessage> = {}): OfficeMessage => ({
  id: `${kind}-${body}`, created_at: at(1), kind, digest_date: null, item: null, body,
  picked_up_at: null, ledger_line: null, ...over,
});

const presence = (over: Partial<OfficePresence> = {}): OfficePresence => ({
  agent: "finance-officer", kind: "specialist", state: "idle", source: "dispatcher", job_id: null, title: null,
  step: null, machine: null, started_at: null, updated_at: at(600), finished_at: null, outcome: null, ...over,
});

const employee = (over: Partial<OfficeEmployee> = {}): OfficeEmployee => ({
  name: "finance-officer", does: "", doing: "", queued: 0, held: 0, blocked: 0, done_7d: 0,
  last_done: "", last_done_at: null, lessons: 0, ...over,
});

describe("decline", () => {
  it("holds a declined mission out of New until the snapshot reports it", () => {
    const r = splitMissions([mission("1"), mission("2")], [msg("decline", "2")]);
    expect(r.open.map((m) => m.id)).toEqual(["1"]);
    expect(r.declined.map((m) => m.id)).toEqual(["2"]);
    expect(r.waiting).toHaveLength(0);
  });
  it("matches whole ids only and ignores a refused decline", () => {
    expect(declinePending([msg("decline", "1671550")], "167155")).toBeNull();
    expect(declinePending([msg("decline", "167155", { ledger_line: "REFUSED decline: x" })], "167155")).toBeNull();
    expect(declinePending([msg("decline", "167155,171386")], "171386")).not.toBeNull();
  });
  it("lets interest win over a decline, whichever was pressed last", () => {
    expect(missionPending([msg("decline", "1"), msg("interest", "1")], "1")?.kind).toBe("interest");
    expect(missionPending([msg("interest", "1"), msg("decline", "1")], "1")?.kind).toBe("interest");
    const r = splitMissions([mission("1")], [msg("decline", "1"), msg("interest", "1")]);
    expect(r.declined).toHaveLength(0);
    expect(r.waiting.map((m) => m.id)).toEqual(["1"]);
  });
  it("never declines a mission the office named as NOT declined, in a mixed batch line", () => {
    const line =
      "DECLINED 333333: marked not for me. Nothing was sent to FlyGuys. NOT declined 111111: interest was already sent; withdraw it in the FlyGuys Pilots app";
    const messages = [msg("decline", "333333,111111", { picked_up_at: at(0), ledger_line: line })];
    expect(declinePending(messages, "333333")).not.toBeNull();
    expect(declinePending(messages, "111111")).toBeNull();
    const r = splitMissions([mission("333333"), mission("111111")], messages);
    expect(r.declined.map((m) => m.id)).toEqual(["333333"]);
    expect(r.open.map((m) => m.id)).toEqual(["111111"]);
  });
  it("reads several ids after NOT declined", () => {
    expect([...notDeclinedIds("NOT declined 1, 2,3: interest was already sent")]).toEqual(["1", "2", "3"]);
    expect(notDeclinedIds(null).size).toBe(0);
  });
  it("declines nothing on a REFUSED or FAILED line", () => {
    for (const line of ["REFUSED decline: a send is in progress; nothing was declined; press again", "FAILED decline: x"]) {
      const messages = [msg("decline", "1,2", { picked_up_at: at(0), ledger_line: line })];
      const r = splitMissions([mission("1"), mission("2")], messages);
      expect(r.declined).toHaveLength(0);
      expect(r.open.map((m) => m.id)).toEqual(["1", "2"]);
    }
  });
  it("never moves a mission with a recorded interest to Declined", () => {
    for (const status of ["interested", "unknown", "possible_award", "mission_email", "lost", "rejected"] as const) {
      const r = splitMissions([mission("1", { status })], [msg("decline", "1")]);
      expect(r.declined).toHaveLength(0);
    }
  });
  it("lets the snapshot status win over a pending message", () => {
    const r = splitMissions([mission("1", { status: "interested" })], [msg("decline", "1")]);
    expect(r.declined).toHaveLength(0);
    expect(r.waiting.map((m) => m.id)).toEqual(["1"]);
  });
  it("files a reported decline under Declined", () => {
    expect(missionTabs([mission("9", { status: "declined" })], []).declined.map((m) => m.id)).toEqual(["9"]);
  });
});

describe("missionTabs", () => {
  it("puts unknown delivery, possible awards and mission emails under Needs attention", () => {
    const t = missionTabs(
      [
        mission("a", { status: "interested" }),
        mission("b", { status: "unknown" }),
        mission("c", { status: "possible_award" }),
        mission("d", { status: "mission_email" }),
        mission("e", { status: "lost" }),
      ],
      []
    );
    expect(t.waiting.map((m) => m.id)).toEqual(["a"]);
    expect(t.attention.map((m) => m.id).sort()).toEqual(["b", "c", "d"]);
    expect(t.closed.map((m) => m.id)).toEqual(["e"]);
  });
});

describe("buildInbox", () => {
  const decision = (n: number, deadline = ""): OfficeDecision => ({ n, title: `D${n}`, tag: "", recommendation: "", deadline, source: "", answer: "" });
  const call = (id: string, over: Partial<OfficeCall> = {}): OfficeCall => ({
    id, title: id, needs: "", held: false, assignee: "", since: at(60), sheet: "", decision: null, unblocks: 0, earlier: [], reply: null, ...over,
  });

  it("sorts most urgent first, then oldest first", () => {
    const items = buildInbox({
      decisions: [decision(1), decision(2, "Today")],
      calls: [call("new-crit", { unblocks: 2, since: at(5) }), call("old-crit", { unblocks: 1, since: at(500) }), call("held", { held: true })],
      missions: [mission("m", { status: "possible_award", outcome_at: at(30) })],
      escalations: [{ file: "x.md", title: "low one", updated: at(9000), severity: "low" }],
      outbriefDate: "2026-10-17",
    });
    expect(items.map((i) => i.key)).toEqual([
      "decision-2",
      "call-old-crit",
      "mission-m",
      "call-new-crit",
      "decision-1",
      "call-held",
      "escalation-x.md",
    ]);
  });
});

describe("deskState", () => {
  it("is working on a fresh check-in", () => {
    expect(deskState(presence({ state: "working", updated_at: at(2) }), undefined, NOW).state).toBe("working");
  });
  it("warns instead of claiming work when the check-in has gone quiet", () => {
    const old = new Date(NOW - STALE_WORKING_MS - 60000).toISOString();
    const s = deskState(presence({ state: "working", updated_at: old }), undefined, NOW);
    expect(s.state).toBe("stale");
    expect(s.tone).toBe("warn");
    expect(s.label).toMatch(/may have stopped/);
  });
  it("uses the newest of presence and snapshot to decide active today", () => {
    expect(deskState(undefined, employee({ last_done_at: at(30) }), NOW).state).toBe("recent");
    expect(deskState(presence({ finished_at: at(30), updated_at: at(30) }), employee({ last_done_at: at(3000) }), NOW).state).toBe("recent");
    expect(deskState(undefined, employee({ last_done_at: at(3000) }), NOW).state).toBe("quiet");
  });
  it("says never used when nothing is on record", () => {
    expect(deskState(undefined, employee(), NOW).state).toBe("never");
  });
});

describe("deskTimeline", () => {
  const ev = (id: number, job: string | null, mins: number, agent = "a"): OfficePresenceEvent => ({
    id, at: at(mins), agent, event: "step", job_id: job, text: String(id),
  });
  it("shows the current job's check-ins oldest first", () => {
    const t = deskTimeline([ev(3, "j1", 1), ev(1, "j1", 10), ev(2, "j0", 5), ev(4, "j1", 2, "b")], "a", "j1");
    expect(t.map((e) => e.id)).toEqual([1, 3]);
  });
  it("falls back to the last 10 check-ins without a job", () => {
    const many = Array.from({ length: 14 }, (_, i) => ev(i, `j${i}`, 100 - i));
    expect(deskTimeline(many, "a", null).map((e) => e.id)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });
});

describe("floorRooms", () => {
  it("places roster desks by department, strangers in Other, automations in their own room", () => {
    const rooms = floorRooms(
      ["finance-officer", "brand-new-agent"],
      [presence({ agent: "security-audit", kind: "automation" }), presence({ agent: "video-producer" })]
    );
    expect(rooms).toEqual([
      { room: "Business", desks: ["finance-officer"] },
      { room: "Content studio", desks: ["video-producer"] },
      { room: "Other", desks: ["brand-new-agent"] },
      { room: "Scheduled automations", desks: ["security-audit"] },
    ]);
  });
  it("makes a two-letter monogram", () => {
    expect(initials("engineering-devops-automator")).toBe("DA");
    expect(initials("finance-officer")).toBe("F");
    expect(initials("sai-ops")).toBe("SO");
  });
});

describe("applyPresenceChange", () => {
  const base = { presence: [presence()], events: [] as OfficePresenceEvent[] };
  it("replaces a desk on update and removes it on delete", () => {
    const up = applyPresenceChange(base, "office_presence", "UPDATE", { ...presence(), state: "working" });
    expect(up.presence).toHaveLength(1);
    expect(up.presence[0].state).toBe("working");
    expect(applyPresenceChange(up, "office_presence", "DELETE", {}, { agent: "finance-officer" }).presence).toHaveLength(0);
  });
  it("appends a new check-in once", () => {
    const row = { id: 7, at: at(0), agent: "a", event: "step", job_id: null, text: "x" };
    const once = applyPresenceChange(base, "office_presence_log", "INSERT", row);
    expect(applyPresenceChange(once, "office_presence_log", "INSERT", row).events).toHaveLength(1);
  });
});
