import { describe, it, expect } from "vitest";
import { isOverdue } from "./Leads";

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
