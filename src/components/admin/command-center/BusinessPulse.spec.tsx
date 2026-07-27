import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { BusinessPulseSnapshot } from "@/lib/command-center/business-pulse";
import BusinessPulse from "./BusinessPulse";

const snapshot: BusinessPulseSnapshot = {
  capturedAt: "2026-07-27T16:00:00.000Z",
  metrics: {
    openLeads: { value: 4, error: null },
    openQuotes: { value: null, error: "Quotes unavailable" },
    activeJobs: { value: 16, error: null },
    pendingDeliveries: { value: 1, error: null },
    outstandingRevenue: { value: 2000, error: null },
    overdueCompliance: { value: 3, error: null },
  },
};

describe("BusinessPulse", () => {
  it("shows normalized metrics with links back to source workflows", () => {
    render(<MemoryRouter><BusinessPulse snapshot={snapshot} /></MemoryRouter>);

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText("$2,000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open leads/i })).toHaveAttribute("href", "/admin/leads");
    expect(screen.getByRole("link", { name: /outstanding revenue/i })).toHaveAttribute("href", "/admin/invoices");
  });

  it("shows a partial source failure without hiding other metrics", () => {
    render(<MemoryRouter><BusinessPulse snapshot={snapshot} /></MemoryRouter>);

    expect(screen.getByText("Quotes unavailable")).toBeInTheDocument();
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("renders a loading state", () => {
    render(<MemoryRouter><BusinessPulse isLoading /></MemoryRouter>);
    expect(screen.getByRole("status", { name: "Loading business pulse" })).toBeInTheDocument();
  });
});
