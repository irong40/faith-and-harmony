import { describe, expect, it } from "vitest";
import { loadRecentActivity, mergeRecentActivity } from "./recent-activity";

const work = [{
  id: "event-1",
  work_item_id: "work-1",
  event_type: "updated",
  created_at: "2026-07-27T15:00:00.000Z",
  work_items: { title: "Approve quote" },
}];
const governance = [{
  id: "gov-1",
  event_type: "compliance_scan",
  summary: "Compliance scan completed",
  created_at: "2026-07-27T14:00:00.000Z",
}];
const jobs = [{
  id: "job-1",
  job_number: "SAI-1042",
  status: "captured",
  updated_at: "2026-07-27T16:00:00.000Z",
}];
const leads = [{
  id: "lead-1",
  caller_name: "Taylor Reed",
  qualification_status: "qualified",
  updated_at: "2026-07-27T13:00:00.000Z",
}];

describe("recent activity", () => {
  it("normalizes company events in reverse chronological order", () => {
    expect(mergeRecentActivity({ work, governance, jobs, leads }).map((item) => item.id))
      .toEqual(["job-job-1", "work-event-1", "governance-gov-1", "lead-lead-1"]);
  });

  it("keeps successful activity when one source fails", async () => {
    const result = await loadRecentActivity({
      work: async () => work,
      governance: async () => { throw new Error("Governance unavailable"); },
      jobs: async () => jobs,
      leads: async () => leads,
    });

    expect(result.items).toHaveLength(3);
    expect(result.errors).toEqual(["Governance unavailable"]);
  });
});
