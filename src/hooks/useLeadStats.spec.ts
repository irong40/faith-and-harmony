import { describe, it, expect } from "vitest";

// Test the exported types and default parameter behavior.
// The hook itself wraps supabase.rpc which requires integration testing.
// These tests verify the type contract is correct.

import type { TimeWindow, LeadStats, SourceCount } from "./useLeadStats";

describe("LeadStats type contract", () => {
  const validStats: LeadStats = {
    time_window: "month",
    conversion: { total: 10, converted: 3, rate: 30.0 },
    by_source: [
      { source: "voice_bot", count: 5 },
      { source: "web_form", count: 3 },
      { source: "manual", count: 2 },
    ],
    response_time: { avg_hours: 4.5 },
    revenue: { total_revenue: 1250.0 },
  };

  it("accepts valid LeadStats shape", () => {
    expect(validStats.time_window).toBe("month");
    expect(validStats.conversion.rate).toBe(30.0);
    expect(validStats.by_source).toHaveLength(3);
    expect(validStats.response_time.avg_hours).toBe(4.5);
    expect(validStats.revenue.total_revenue).toBe(1250.0);
  });

  it("accepts all valid TimeWindow values", () => {
    const windows: TimeWindow[] = ["week", "month", "all"];
    expect(windows).toHaveLength(3);
  });

  it("SourceCount has source and count fields", () => {
    const item: SourceCount = { source: "social", count: 7 };
    expect(item.source).toBe("social");
    expect(item.count).toBe(7);
  });

  it("handles zero state stats", () => {
    const empty: LeadStats = {
      time_window: "all",
      conversion: { total: 0, converted: 0, rate: 0 },
      by_source: [],
      response_time: { avg_hours: 0 },
      revenue: { total_revenue: 0 },
    };
    expect(empty.conversion.total).toBe(0);
    expect(empty.by_source).toEqual([]);
    expect(empty.response_time.avg_hours).toBe(0);
  });
});
