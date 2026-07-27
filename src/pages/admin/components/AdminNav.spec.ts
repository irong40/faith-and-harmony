import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

import { isPathActive, sectionScore, activeSectionHref } from "./AdminNav";

// ---------------------------------------------------------------------------
// Two different matching rules live in the nav, and conflating them is what
// makes a nav quietly lie about where you are.
//
//   * Areas match by PREFIX  — /admin/missions/:id keeps "Missions" lit.
//   * Sections match EXACTLY — including any query string they declare, because
//     /admin/clients and /admin/clients?tab=messages are now two sections over
//     one pathname.
// ---------------------------------------------------------------------------

describe("isPathActive", () => {
  it("matches the exact path", () => {
    expect(isPathActive("/admin/missions", "/admin/missions")).toBe(true);
  });

  it("keeps the parent lit on a detail route", () => {
    expect(isPathActive("/admin/missions/abc-123", "/admin/missions")).toBe(true);
  });

  it("keeps the parent lit two segments deep", () => {
    expect(isPathActive("/admin/missions/abc-123/delivery", "/admin/missions")).toBe(true);
  });

  it("does not match a sibling that merely shares a prefix string", () => {
    expect(isPathActive("/admin/missions-archive", "/admin/missions")).toBe(false);
  });

  it("ignores the query half of a section href", () => {
    expect(isPathActive("/admin/clients", "/admin/clients?tab=messages")).toBe(true);
  });
});

describe("sectionScore", () => {
  it("scores a plain path match at zero", () => {
    expect(sectionScore("/admin/clients", "", "/admin/clients")).toBe(0);
  });

  it("scores one point per satisfied query param", () => {
    expect(sectionScore("/admin/clients", "?tab=messages", "/admin/clients?tab=messages")).toBe(1);
  });

  it("rejects a section whose query param is absent", () => {
    expect(sectionScore("/admin/clients", "", "/admin/clients?tab=messages")).toBe(-1);
  });

  it("rejects a section whose query param has a different value", () => {
    expect(sectionScore("/admin/clients", "?tab=notes", "/admin/clients?tab=messages")).toBe(-1);
  });

  it("rejects a different pathname outright", () => {
    expect(sectionScore("/admin/missions", "", "/admin/clients")).toBe(-1);
  });
});

describe("activeSectionHref", () => {
  const icon = () => null;
  const clientSections = [
    { href: "/admin/clients", label: "Directory", icon },
    { href: "/admin/clients?tab=messages", label: "Messages", icon },
  ];

  it("lights Directory on the bare clients path", () => {
    expect(activeSectionHref("/admin/clients", "", clientSections)).toBe("/admin/clients");
  });

  it("lights Messages — and only Messages — when ?tab=messages is set", () => {
    expect(activeSectionHref("/admin/clients", "?tab=messages", clientSections)).toBe(
      "/admin/clients?tab=messages"
    );
  });

  it("keeps Messages lit when a stored ?conversation= rides along", () => {
    expect(
      activeSectionHref("/admin/clients", "?tab=messages&conversation=abc", clientSections)
    ).toBe("/admin/clients?tab=messages");
  });

  it("returns null when nothing in the area matches", () => {
    expect(activeSectionHref("/admin/settings", "", clientSections)).toBeNull();
  });

  it("prefers the exact child over its parent", () => {
    const missionSections = [
      { href: "/admin/missions", label: "All Missions", icon },
      { href: "/admin/missions/new", label: "New Mission", icon },
    ];
    expect(activeSectionHref("/admin/missions/new", "", missionSections)).toBe(
      "/admin/missions/new"
    );
  });
});
