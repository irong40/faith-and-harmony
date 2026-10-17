import { describe, expect, it } from "vitest";
import {
  airspaceTone,
  flyableNow,
  interestPending,
  missionStatusTone,
  splitMissions,
  type OfficeMessage,
  type OfficeMission,
} from "./office";

const mission = (id: string, over: Partial<OfficeMission> = {}): OfficeMission => ({
  id,
  name: `M ${id}`,
  city: "Chesapeake",
  state: "Virginia",
  miles: 5,
  acres: 20,
  capture: "10/23/26",
  due: "10/31/26",
  deviation: "",
  flyguys_airspace: "",
  airspace_level: "NONE",
  airspace_text: "No authorization needed (Class G)",
  lat: 36.7,
  lng: -76.2,
  status: "open",
  interest_at: null,
  outcome_subject: null,
  outcome_at: null,
  ...over,
});

const msg = (body: string, over: Partial<OfficeMessage> = {}): OfficeMessage => ({
  id: body,
  created_at: new Date().toISOString(),
  kind: "interest",
  digest_date: null,
  item: null,
  body,
  picked_up_at: null,
  ledger_line: null,
  ...over,
});

describe("airspaceTone", () => {
  it("never shows an unknown verdict as clear", () => {
    expect(airspaceTone("UNKNOWN").tone).toBe("idle");
    expect(airspaceTone("garbage").label).toBe("Airspace unknown");
    expect(airspaceTone("NONE").tone).toBe("good");
    expect(airspaceTone("SKIP").tone).toBe("crit");
  });
});

describe("flyableNow", () => {
  it("is only Class G or easy LAANC", () => {
    expect(flyableNow(mission("1"))).toBe(true);
    expect(flyableNow(mission("2", { airspace_level: "EASY_LAANC" }))).toBe(true);
    expect(flyableNow(mission("3", { airspace_level: "DRONEZONE" }))).toBe(false);
    expect(flyableNow(mission("4", { airspace_level: "UNKNOWN" }))).toBe(false);
  });
});

describe("interestPending", () => {
  it("matches a mission inside a comma list, not a substring of another id", () => {
    expect(interestPending([msg("167155,171386")], "171386")).not.toBeNull();
    expect(interestPending([msg("1671550")], "167155")).toBeNull();
  });
  it("keeps a sent mission out of Open until the snapshot reports it (Codex re-review)", () => {
    expect(interestPending([msg("167155", { picked_up_at: "x", ledger_line: "SENDING interest to FlyGuys" })], "167155")).not.toBeNull();
    expect(interestPending([msg("167155", { picked_up_at: "x", ledger_line: "INTEREST SENT to FlyGuys: added 1 (167155)" })], "167155")).not.toBeNull();
    expect(interestPending([msg("167155", { picked_up_at: "x", ledger_line: "UNKNOWN delivery for 167155" })], "167155")).not.toBeNull();
    const { open, waiting } = splitMissions(
      [mission("167155")],
      [msg("167155", { picked_up_at: "x", ledger_line: "INTEREST SENT to FlyGuys: added 1 (167155)" })]
    );
    expect(open).toHaveLength(0);
    expect(waiting.map((m) => m.id)).toEqual(["167155"]);
  });
  it("lets the snapshot status win: a mission FlyGuys rejected is closed, not waiting", () => {
    const r = splitMissions(
      [mission("222222", { status: "rejected" }), mission("333333", { status: "unknown" })],
      [msg("222222,333333", { picked_up_at: "x", ledger_line: "INTEREST SENT to FlyGuys: added 0; no longer open 222222" })]
    );
    expect(r.lost.map((m) => m.id)).toEqual(["222222"]);
    expect(r.waiting.map((m) => m.id)).toEqual(["333333"]);
    expect(r.open).toHaveLength(0);
  });
  it("ignores refused or failed sends so the mission can be picked again", () => {
    expect(interestPending([msg("167155", { picked_up_at: "x", ledger_line: "FAILED interest for 167155" })], "167155")).toBeNull();
    expect(interestPending([msg("167155", { picked_up_at: "x", ledger_line: "REFUSED interest: x" })], "167155")).toBeNull();
  });
  it("ignores other message kinds", () => {
    expect(interestPending([msg("167155", { kind: "directive" })], "167155")).toBeNull();
  });
});

describe("splitMissions", () => {
  it("moves a mission to waiting as soon as interest is SENT, before the office collects it", () => {
    const { open, waiting } = splitMissions([mission("1"), mission("2")], [msg("2")]);
    expect(open.map((m) => m.id)).toEqual(["1"]);
    expect(waiting.map((m) => m.id)).toEqual(["2"]);
  });
  it("sorts open missions nearest first and files outcomes", () => {
    const r = splitMissions(
      [
        mission("far", { miles: 40 }),
        mission("near", { miles: 3 }),
        mission("lost", { status: "lost" }),
        mission("won", { status: "possible_award" }),
        mission("int", { status: "interested" }),
      ],
      []
    );
    expect(r.open.map((m) => m.id)).toEqual(["near", "far"]);
    expect(r.lost.map((m) => m.id)).toEqual(["lost"]);
    expect(r.award.map((m) => m.id)).toEqual(["won"]);
    expect(r.waiting.map((m) => m.id)).toEqual(["int"]);
  });
});

describe("missionStatusTone", () => {
  it("flags a possible award for attention", () => {
    expect(missionStatusTone("possible_award").tone).toBe("warn");
  });
});
