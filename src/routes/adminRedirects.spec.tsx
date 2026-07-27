import { describe, it, expect } from "vitest";
import { render, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, matchRoutes, useLocation } from "react-router-dom";
import {
  ADMIN_REDIRECTS,
  adminRedirectRoutes,
  mergeSearch,
  splitTarget,
} from "./adminRedirects";
import { assertExtractorSane, mountedRoutePatterns } from "./appRoutes.testkit";

// ---------------------------------------------------------------------------
// These redirects are load-bearing for `notifications.link`: five edge
// functions have already written absolute admin paths into that column, and
// NotificationBell renders them verbatim via <Link to={notif.link}>. A stored
// row from months ago must still land somewhere useful, WITH its query string
// intact — dropping `?conversation=<uuid>` silently strands the user on a list
// view with no error to explain it.
//
// The landing spot is asserted against the routes App.tsx really mounts, not
// against a `*` catch-all. A catch-all swallows the failure mode that matters:
// a redirect whose TARGET does not exist still "redirects", it just redirects
// to NotFound. See appRoutes.testkit.ts.
// ---------------------------------------------------------------------------

/** Full route patterns App.tsx mounts, catch-all excluded. */
const MOUNTED = mountedRoutePatterns();
const MOUNTED_ROUTES = MOUNTED.map((path) => ({ path }));

/** True when `pathname` resolves to a real route (not the catch-all). */
function isMounted(pathname: string): boolean {
  return (matchRoutes(MOUNTED_ROUTES, pathname) ?? []).length > 0;
}

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

// Scoped to its own container rather than `screen`, so a test may render more
// than one redirect without tripping over "found multiple elements".
function renderAt(initialEntry: string) {
  const { container } = render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {adminRedirectRoutes()}
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
  const q = within(container);
  return {
    pathname: () => q.getByTestId("pathname").textContent ?? "",
    search: () => q.getByTestId("search").textContent ?? "",
    hash: () => q.getByTestId("hash").textContent ?? "",
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

  // --- the target has to exist ---------------------------------------------

  it("extracts App.tsx's mounted routes (guards the guard)", () => {
    expect(() => assertExtractorSane(MOUNTED)).not.toThrow();
    // Sanity in the other direction: a plausible-looking typo must NOT match.
    expect(isMounted("/admin/klients")).toBe(false);
    expect(isMounted("/admin/messages")).toBe(false);
  });

  it.each(CASES.map((c) => [c.from, c.pathname]))(
    "%s lands on %s, which App.tsx actually mounts",
    (from, pathname) => {
      expect(isMounted(pathname), `${from} -> ${pathname} is not a mounted route`).toBe(true);
    }
  );

  it("every rendered redirect lands somewhere App.tsx mounts", () => {
    // Renders each redirect for real, then checks the resolved pathname —
    // so a target that only exists in the CASES table cannot pass.
    for (const { from } of CASES) {
      const at = renderAt(from);
      const landed = at.pathname();
      expect(isMounted(landed), `${from} redirected to unmounted ${landed}`).toBe(true);
    }
  });

  it("carries ids to a mounted route, not just a plausible string", () => {
    const at = renderAt("/admin/drone-jobs/abc-123/delivery");
    expect(at.pathname()).toBe("/admin/missions/abc-123/delivery");
    expect(isMounted(at.pathname())).toBe(true);
  });

  // --- search AND hash survive, for every redirect --------------------------

  it.each(CASES.map((c) => [c.from, c.pathname, c.search ?? ""]))(
    "%s preserves search and hash on the way to %s%s",
    (from, pathname, targetSearch) => {
      // `#anchor` and the two params stand in for a stored notification link.
      const at = renderAt(`${from}?conversation=abc-123&keep=two%20words#row-9`);

      expect(at.pathname()).toBe(pathname);
      expect(at.hash()).toBe("#row-9");

      const landed = new URLSearchParams(at.search());
      expect(landed.get("conversation")).toBe("abc-123");
      expect(landed.get("keep")).toBe("two words");

      // The target's own params still win where it declares any.
      for (const [key, value] of new URLSearchParams(targetSearch)) {
        expect(landed.get(key)).toBe(value);
      }
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

  it("does not retire a path App.tsx still mounts", () => {
    // A redirect that shadows a live route would make that route unreachable.
    for (const { from } of ADMIN_REDIRECTS) {
      const literal = from.replace(/\/\*$/, "");
      expect(
        MOUNTED.includes(literal),
        `${from} is retired but App.tsx still mounts ${literal}`
      ).toBe(false);
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
