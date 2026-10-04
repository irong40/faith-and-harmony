import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { OfficeReportBody, OfficeReportSummary } from "@/lib/officeReports";

// The page is driven by these two hooks, so the spec controls them. The
// database rule (admins read, nobody else) is the one thing a spec cannot
// prove; it was checked against the live table when this page was built.
let listState: { data?: OfficeReportSummary[]; error: unknown; isLoading: boolean; isFetching: boolean };
let bodies: Record<string, OfficeReportBody>;
const refetch = vi.fn();

vi.mock("@/hooks/useOfficeReports", () => ({
  useOfficeReports: () => ({ ...listState, refetch }),
  useOfficeReportBody: (id: string | null) => ({
    data: id ? bodies[id] : undefined,
    error: null,
    isLoading: false,
    refetch,
  }),
}));

import OfficeReports from "./OfficeReports";

const MINUTES = `---
tags: [agent-office, meeting]
date: 2026-09-11
---

# Staff Meeting 2026-09-11

**Prepared by:** COO

## CRITICAL ALERTS

1. **SBSD Certification overdue.** One portal click.
2. See [the notice](https://sam.gov/opp/1) and [a bad link](javascript:alert(1)).

| Item | Status |
|---|---|
| Submit SBSD | NOT DONE |

- [ ] Call DLA
- [x] Renew SkyWatch

<script>window.hacked = true</script>
`;

const HTML = "<!DOCTYPE html><html><body><h1>Letterhead minutes</h1><script>parent.hacked = true</script></body></html>";

const summary = (id: string, day: string, text: string | null = null): OfficeReportSummary => ({
  id,
  kind: "staff-meeting",
  report_date: day,
  title: `Staff meeting, ${day}`,
  summary: text,
  updated_at: new Date(Date.now() - 3 * 60000).toISOString(),
});

const renderPage = (path = "/admin/reports/office") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <OfficeReports />
    </MemoryRouter>
  );

afterEach(cleanup);

beforeEach(() => {
  refetch.mockReset();
  listState = {
    data: [
      summary("r-sep11", "2026-09-11", "5 critical alerts. First: NM Bitter Lake NWR bid expired."),
      summary("r-sep04", "2026-09-04"),
      summary("r-aug28", "2026-08-28"),
    ],
    error: null,
    isLoading: false,
    isFetching: false,
  };
  bodies = {
    "r-sep11": { id: "r-sep11", body_md: MINUTES, body_html: HTML, source_path: "agent-office/meetings/2026-09-11-staff-meeting" },
    "r-sep04": { id: "r-sep04", body_md: MINUTES, body_html: null, source_path: "agent-office/meetings/2026-09-04-staff-meeting" },
    "r-aug28": { id: "r-aug28", body_md: null, body_html: null, source_path: "agent-office/meetings/2026-08-28-staff-meeting" },
  };
});

describe("Office reports page", () => {
  it("lists the minutes by month, newest first, and opens the newest", () => {
    renderPage();
    const list = screen.getByRole("navigation", { name: "Reports" });
    expect(within(list).getByText("September 2026")).toBeTruthy();
    expect(within(list).getByText("August 2026")).toBeTruthy();
    expect(within(list).getAllByRole("button").length).toBe(3);
    expect(screen.getByRole("heading", { level: 2, name: "Staff meeting, 2026-09-11" })).toBeTruthy();
    expect(screen.getByText("Friday, September 11, 2026", { exact: false })).toBeTruthy();
  });

  it("shows the letterhead copy in a frame that cannot run script or reach the page", () => {
    const { container } = renderPage();
    const frame = container.querySelector("iframe") as HTMLIFrameElement;
    expect(frame).toBeTruthy();
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("srcdoc")).toContain("Letterhead minutes");
    expect(frame.getAttribute("srcdoc")).toContain("padding:28px 36px");
    // The office's HTML is never written into this page itself.
    expect(container.querySelector("script")).toBeNull();
    expect(screen.queryByText("Letterhead minutes")).toBeNull();
  });

  it("switches to plain text and renders the Markdown without its tag block or any markup from it", () => {
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Plain text" }));
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "CRITICAL ALERTS" })).toBeTruthy();
    expect(screen.queryByText("tags: [agent-office, meeting]", { exact: false })).toBeNull();
    expect(screen.getByText("SBSD Certification overdue.").tagName).toBe("STRONG");
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "NOT DONE" })).toBeTruthy();
    expect(screen.getByText("[open]")).toBeTruthy();
    expect(screen.getByText("[done]")).toBeTruthy();
    // A web link is a link. A javascript: link is only its words.
    expect((screen.getByRole("link", { name: "the notice" }) as HTMLAnchorElement).getAttribute("href")).toBe("https://sam.gov/opp/1");
    expect(screen.queryByRole("link", { name: "a bad link" })).toBeNull();
    expect(screen.getByText("a bad link", { exact: false })).toBeTruthy();
    // A script tag typed into the minutes shows as text and is not an element.
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>window.hacked = true</script>")).toBeTruthy();
  });

  it("opens another meeting when it is picked, and offers no letterhead when there is none", () => {
    const { container } = renderPage();
    const list = screen.getByRole("navigation", { name: "Reports" });
    fireEvent.click(within(list).getAllByRole("button")[1]);
    expect(screen.getByRole("heading", { level: 2, name: "Staff meeting, 2026-09-04" })).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByRole("button", { name: "Letterhead" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "CRITICAL ALERTS" })).toBeTruthy();
    expect(within(list).getAllByRole("button")[1].getAttribute("aria-current")).toBe("true");
  });

  it("opens the meeting a link names", () => {
    renderPage("/admin/reports/office?report=r-sep04");
    expect(screen.getByRole("heading", { level: 2, name: "Staff meeting, 2026-09-04" })).toBeTruthy();
  });

  it("says so when a report has no text", () => {
    renderPage("/admin/reports/office?report=r-aug28");
    expect(screen.getByText("This report has no text")).toBeTruthy();
  });

  it("says what to expect when nothing has been posted yet", () => {
    listState = { data: [], error: null, isLoading: false, isFetching: false };
    renderPage();
    expect(screen.getByText("No reports yet")).toBeTruthy();
  });

  it("says access is not turned on, with no retry, when the database refuses the read", () => {
    listState = { data: undefined, error: { code: "42501", message: "permission denied for table office_reports" }, isLoading: false, isFetching: false };
    renderPage();
    expect(screen.getByText("Report access is not turned on yet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("offers a retry on any other failure", () => {
    listState = { data: undefined, error: new Error("network down"), isLoading: false, isFetching: false };
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
