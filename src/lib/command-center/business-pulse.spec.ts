import { describe, expect, it } from "vitest";
import { aggregateBusinessPulse, loadBusinessPulse } from "./business-pulse";

const data = {
  leads: [
    { qualification_status: "pending" },
    { qualification_status: "qualified" },
    { qualification_status: "converted" },
  ],
  quotes: [
    { status: "draft" },
    { status: "sent" },
    { status: "accepted" },
  ],
  jobs: [
    { status: "scheduled", delivery_status: null, is_test: false },
    { status: "complete", delivery_status: "ready", is_test: false },
    { status: "delivered", delivery_status: "sent", is_test: false },
    { status: "scheduled", delivery_status: null, is_test: true },
  ],
  payments: [
    { status: "pending", amount: 1200 },
    { status: "overdue", amount: 800 },
    { status: "paid", amount: 700 },
    { status: "waived", amount: 100 },
  ],
  obligations: [
    { status: "pending", due_date: "2026-07-26" },
    { status: "complete", due_date: "2026-07-20" },
    { status: "overdue", due_date: "2026-08-01" },
  ],
};

describe("business pulse", () => {
  it("normalizes live CRM records without counting tests or terminal records", () => {
    expect(aggregateBusinessPulse(data, new Date("2026-07-27T16:00:00.000Z"))).toEqual({
      openLeads: 2,
      openQuotes: 2,
      activeJobs: 2,
      pendingDeliveries: 1,
      outstandingRevenue: 2000,
      overdueCompliance: 2,
    });
  });

  it("reports one failed source without blanking successful metrics", async () => {
    const snapshot = await loadBusinessPulse({
      leads: async () => data.leads,
      quotes: async () => { throw new Error("Quotes unavailable"); },
      jobs: async () => data.jobs,
      payments: async () => data.payments,
      obligations: async () => data.obligations,
    }, new Date("2026-07-27T16:00:00.000Z"));

    expect(snapshot.metrics.openLeads).toEqual({ value: 2, error: null });
    expect(snapshot.metrics.openQuotes.value).toBeNull();
    expect(snapshot.metrics.openQuotes.error).toBe("Quotes unavailable");
    expect(snapshot.metrics.activeJobs).toEqual({ value: 2, error: null });
    expect(snapshot.metrics.outstandingRevenue).toEqual({ value: 2000, error: null });
  });
});
