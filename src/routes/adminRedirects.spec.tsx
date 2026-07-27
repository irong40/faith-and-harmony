import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import {
  ADMIN_REDIRECTS,
  adminRedirectRoutes,
  mergeSearch,
  splitTarget,
} from "./adminRedirects";

// ---------------------------------------------------------------------------
// These redirects are load-bearing for `notifications.link`: five edge
// functions have already written absolute admin paths into that column, and
// NotificationBell renders them verbatim via <Link to={notif.link}>. A stored
// row from months ago must still land somewhere useful, WITH its query string
// intact — dropping `?conversation=<uuid>` silently strands the user on a list
// view with no error to explain it.
// ---------------------------------------------------------------------------

/** Renders the resolved location so assertions can read pathname/search/hash. */
function LocationProbe() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="hash">{location.hash}</span>
    </div>
  );
}

function renderAt(initialEntry: string) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {adminRedirectRoutes()}
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
  return {
    pathname: () => screen.getByTestId("pathname").textContent,
    search: () => screen.getByTestId("search").textContent,
    hash: () => screen.getByTestId("hash").textContent,
  };
}

/**
 * One concrete legacy URL per retired route, with the exact landing spot.
 * `source` ties the case back to its ADMIN_REDIRECTS entry so the coverage
 * test below can prove no entry ships untested.
 */
const CASES: Array<{
  source: string;
  from: string;
  pathname: string;
  search?: string;
}> = [
  { source: "/admin/accessories", from: "/admin/accessories", pathname: "/admin/settings/accessories" },
  { source: "/admin/call-logs", from: "/admin/call-logs", pathname: "/admin/pipeline/leads", search: "?tab=calls" },
  { source: "/admin/contracts", from: "/admin/contracts", pathname: "/admin" },
  { source: "/admin/dashboard", from: "/admin/dashboard", pathname: "/admin" },
  { source: "/admin/drone-jobs/*", from: "/admin/drone-jobs", pathname: "/admin/missions" },
  { source: "/admin/governance", from: "/admin/governance", pathname: "/admin" },
  { source: "/admin/invoices", from: "/admin/invoices", pathname: "/admin/missions" },
  { source: "/admin/jobs/new", from: "/admin/jobs/new", pathname: "/admin/missions/new" },
  { source: "/admin/leads", from: "/admin/leads", pathname: "/admin/pipeline/leads" },
  { source: "/admin/messages", from: "/admin/messages", pathname: "/admin/clients", search: "?tab=messages" },
  { source: "/admin/people", from: "/admin/people", pathname: "/admin/clients" },
  { source: "/admin/pricing", from: "/admin/pricing", pathname: "/admin/settings/pricing" },
  { source: "/admin/processing-templates", from: "/admin/processing-templates", pathname: "/admin/settings/templates" },
  { source: "/admin/projects", from: "/admin/projects", pathname: "/admin/missions" },
  { source: "/admin/proposals", from: "/admin/proposals", pathname: "/admin/pipeline" },
  { source: "/admin/quote-requests", from: "/admin/quote-requests", pathname: "/admin/pipeline" },
  { source: "/admin/scheduling", from: "/admin/scheduling", pathname: "/admin/calendar" },
  { source: "/admin/weather", from: "/admin/weather", pathname: "/admin/calendar", search: "?tab=weather" },
];

describe("adminRedirectRoutes", () => {
  it("returns a bare array of Route elements, not a fragment", () => {
    const routes = adminRedirectRoutes();
    expect(Array.isArray(routes)).toBe(true);
    expect(routes).toHaveLength(ADMIN_REDIRECTS.length);
  });

  it("exercises every entry in ADMIN_REDIRECTS", () => {
    const covered = new Set(CASES.map((c) => c.source));
    for (const { from } of ADMIN_REDIRECTS) {
      expect(covered.has(from), `${from} has no redirect test case`).toBe(true);
    }
  });

  it.each(CASES.map((c) => [c.from, c.pathname, c.search ?? ""]))(
    "redirects %s -> %s%s",
    (from, pathname, search) => {
      const at = renderAt(from);
      expect(at.pathname()).toBe(pathname);
      expect(at.search()).toBe(search);
    }
  );

  // --- the rename carries ids ----------------------------------------------

  it("carries a job id across the drone-jobs -> missions rename", () => {
    const at = renderAt("/admin/drone-jobs/abc-123");
    expect(at.pathname()).toBe("/admin/missions/abc-123");
  });

  it("carries a nested delivery segment across the rename", () => {
    const at = renderAt("/admin/drone-jobs/abc-123/delivery");
    expect(at.pathname()).toBe("/admin/missions/abc-123/delivery");
  });

  it("keeps drone-jobs list filters across the rename", () => {
    const at = renderAt("/admin/drone-jobs?delivery=ready&pilot=p1");
    expect(at.pathname()).toBe("/admin/missions");
    expect(at.search()).toBe("?delivery=ready&pilot=p1");
  });

  // --- stored notification links -------------------------------------------

  it("preserves the search string across the hop", () => {
    const at = renderAt("/admin/people?conversation=abc-123&tab=open");
    expect(at.pathname()).toBe("/admin/clients");
    expect(at.search()).toBe("?conversation=abc-123&tab=open");
  });

  it("keeps ?conversation= alive when the target adds its own ?tab=", () => {
    // The exact shape message-api and send-message-notification write.
    const at = renderAt("/admin/messages?conversation=9f2b-uuid");
    expect(at.pathname()).toBe("/admin/clients");
    expect(at.search()).toContain("conversation=9f2b-uuid");
    expect(at.search()).toContain("tab=messages");
  });

  it("preserves the hash across the hop", () => {
    const at = renderAt("/admin/invoices#section-4");
    expect(at.pathname()).toBe("/admin/missions");
    expect(at.hash()).toBe("#section-4");
  });

  it("preserves search AND hash together", () => {
    const at = renderAt("/admin/proposals?status=sent#row-9");
    expect(at.pathname()).toBe("/admin/pipeline");
    expect(at.search()).toBe("?status=sent");
    expect(at.hash()).toBe("#row-9");
  });

  it("leaves search and hash empty when the source had none", () => {
    const at = renderAt("/admin/governance");
    expect(at.pathname()).toBe("/admin");
    expect(at.search()).toBe("");
    expect(at.hash()).toBe("");
  });

  it("never points a redirect at another retired path", () => {
    const retired = new Set(ADMIN_REDIRECTS.map((r) => r.from));
    for (const { from, pathname } of CASES) {
      expect(retired.has(pathname), `${from} -> ${pathname} chains into another redirect`).toBe(
        false
      );
    }
  });
});

describe("mergeSearch", () => {
  it("passes the incoming search through byte for byte when the target has none", () => {
    expect(mergeSearch("?a=1&b=two%20words", "")).toBe("?a=1&b=two%20words");
  });

  it("returns the target search when there is no incoming search", () => {
    expect(mergeSearch("", "?tab=weather")).toBe("?tab=weather");
  });

  it("merges both, with the target key winning", () => {
    expect(mergeSearch("?tab=old&keep=1", "?tab=messages")).toBe("?tab=messages&keep=1");
  });

  it("returns an empty string when neither side has params", () => {
    expect(mergeSearch("", "")).toBe("");
  });
});

describe("splitTarget", () => {
  it("splits a target that carries a query string", () => {
    expect(splitTarget("/admin/clients?tab=messages")).toEqual({
      pathname: "/admin/clients",
      search: "?tab=messages",
    });
  });

  it("returns an empty search for a plain path", () => {
    expect(splitTarget("/admin/missions")).toEqual({
      pathname: "/admin/missions",
      search: "",
    });
  });
});
