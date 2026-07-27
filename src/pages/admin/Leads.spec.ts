import { describe, it, expect } from "vitest";
import {
  isOverdue,
  isSourceFilterActive,
  getQualifiedUnconvertedLeads,
  toggleLeadSelection,
  resolveLeadTab,
} from "./Leads";

// ---------------------------------------------------------------------------
// resolveLeadTab is a URL contract, not a UI detail: /admin/call-logs is a
// permanent redirect to /admin/pipeline/leads?tab=calls, and stored
// notification links have to open the panel they were written for.
// ---------------------------------------------------------------------------
describe("resolveLeadTab", () => {
  it("defaults to the B2B tab when no tab param is present", () => {
    expect(resolveLeadTab(null)).toBe("drone");
  });

  it("opens the call log when the retired /admin/call-logs redirect lands", () => {
    expect(resolveLeadTab("calls")).toBe("calls");
  });

  it("opens voice leads on ?tab=voice", () => {
    expect(resolveLeadTab("voice")).toBe("voice");
  });

  it("falls back to the default tab for an unknown value rather than blanking", () => {
    expect(resolveLeadTab("nonsense")).toBe("drone");
  });

  it("falls back to the default tab for an empty value", () => {
    expect(resolveLeadTab("")).toBe("drone");
  });
});

describe("isOverdue", () => {
  it("returns true when any lead_notes entry has a past follow_up_at", () => {
    expect(isOverdue({ lead_notes: [{ follow_up_at: "2020-01-01" }] })).toBe(true);
  });

  it("returns false when all lead_notes entries have null follow_up_at", () => {
    expect(isOverdue({ lead_notes: [{ follow_up_at: null }] })).toBe(false);
  });

  it("returns false when lead_notes is empty", () => {
    expect(isOverdue({ lead_notes: [] })).toBe(false);
  });

  it("returns false when follow_up_at is a future date", () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    expect(isOverdue({ lead_notes: [{ follow_up_at: futureDate }] })).toBe(false);
  });

  it("returns true when one entry is past and another is null", () => {
    expect(
      isOverdue({
        lead_notes: [
          { follow_up_at: null },
          { follow_up_at: "2020-06-15" },
        ],
      })
    ).toBe(true);
  });
});

describe("isSourceFilterActive", () => {
  it("returns false when filter is All", () => {
    expect(isSourceFilterActive("All")).toBe(false);
  });

  it("returns true when filter is manual", () => {
    expect(isSourceFilterActive("manual")).toBe(true);
  });

  it("returns true when filter is voice_bot", () => {
    expect(isSourceFilterActive("voice_bot")).toBe(true);
  });
});

// Minimal LeadRow stub for pure function tests
type MinimalLead = {
  id: string;
  qualification_status: string;
  client_id: string | null;
};

function makeLead(overrides: Partial<MinimalLead>): MinimalLead {
  return {
    id: "lead-1",
    qualification_status: "pending",
    client_id: null,
    ...overrides,
  };
}

describe("getQualifiedUnconvertedLeads", () => {
  it("returns empty array when given empty array", () => {
    expect(getQualifiedUnconvertedLeads([])).toEqual([]);
  });

  it("returns qualified lead when client_id is null", () => {
    const lead = makeLead({ qualification_status: "qualified", client_id: null });
    expect(getQualifiedUnconvertedLeads([lead as never])).toHaveLength(1);
  });

  it("returns empty array when lead is qualified but client_id is set (already converted)", () => {
    const lead = makeLead({ qualification_status: "qualified", client_id: "client-abc" });
    expect(getQualifiedUnconvertedLeads([lead as never])).toHaveLength(0);
  });

  it("returns empty array when lead is pending", () => {
    const lead = makeLead({ qualification_status: "pending", client_id: null });
    expect(getQualifiedUnconvertedLeads([lead as never])).toHaveLength(0);
  });
});

describe("toggleLeadSelection", () => {
  it("adds leadId when not present in set", () => {
    const result = toggleLeadSelection(new Set(), "abc");
    expect(result.has("abc")).toBe(true);
    expect(result.size).toBe(1);
  });

  it("removes leadId when already present in set", () => {
    const result = toggleLeadSelection(new Set(["abc"]), "abc");
    expect(result.has("abc")).toBe(false);
    expect(result.size).toBe(0);
  });

  it("adds new leadId without removing existing ones", () => {
    const result = toggleLeadSelection(new Set(["abc"]), "xyz");
    expect(result.has("abc")).toBe(true);
    expect(result.has("xyz")).toBe(true);
    expect(result.size).toBe(2);
  });
});
