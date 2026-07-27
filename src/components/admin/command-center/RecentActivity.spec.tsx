import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { RecentActivitySnapshot } from "@/lib/command-center/recent-activity";
import RecentActivity from "./RecentActivity";

const snapshot: RecentActivitySnapshot = {
  items: [
    {
      id: "job-1",
      title: "Job SAI-1042",
      detail: "Moved to captured",
      source: "operations",
      occurredAt: "2026-07-27T16:00:00.000Z",
      href: "/admin/drone-jobs/job-1",
    },
    {
      id: "work-1",
      title: "Approve crane quote",
      detail: "Work updated",
      source: "work",
      occurredAt: "2026-07-27T15:00:00.000Z",
      href: "/admin/work?item=work-1",
    },
  ],
  errors: ["Governance unavailable"],
};

describe("RecentActivity", () => {
  it("renders chronological activity with source links", () => {
    render(<MemoryRouter><RecentActivity snapshot={snapshot} /></MemoryRouter>);

    expect(screen.getAllByRole("link").map((link) => link.textContent)).toEqual([
      expect.stringContaining("Job SAI-1042"),
      expect.stringContaining("Approve crane quote"),
    ]);
    expect(screen.getByRole("link", { name: /job sai-1042/i })).toHaveAttribute("href", "/admin/drone-jobs/job-1");
  });

  it("shows partial source health", () => {
    render(<MemoryRouter><RecentActivity snapshot={snapshot} /></MemoryRouter>);
    expect(screen.getByText("1 activity source unavailable")).toBeInTheDocument();
  });

  it("renders empty and loading states", () => {
    const { rerender } = render(<MemoryRouter><RecentActivity snapshot={{ items: [], errors: [] }} /></MemoryRouter>);
    expect(screen.getByText("No company activity yet")).toBeInTheDocument();

    rerender(<MemoryRouter><RecentActivity isLoading /></MemoryRouter>);
    expect(screen.getByRole("status", { name: "Loading recent activity" })).toBeInTheDocument();
  });
});
