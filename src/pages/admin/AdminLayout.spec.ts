import { describe, it, expect, vi } from "vitest";

// AdminLayout pulls in AdminNav -> NotificationBell -> the Supabase client at
// import time. Stub it so this stays a unit test of the key function.
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

import { boundaryKey } from "./AdminLayout";

// ---------------------------------------------------------------------------
// The ErrorBoundary key decides what counts as "a different page".
//
// Too narrow (pathname only) and a crash in /admin/calendar?tab=weather follows
// the user into /admin/calendar — same pathname, no remount, error fallback
// forever. Too wide (the whole search string) and every filter keystroke tears
// the page down, refetches it, and wipes the error fallback the moment the user
// touches a control.
// ---------------------------------------------------------------------------

describe("boundaryKey", () => {
  it("changes when the pathname changes", () => {
    expect(boundaryKey("/admin/clients", "")).not.toBe(boundaryKey("/admin/missions", ""));
  });

  it("changes between sibling tabs on the same pathname", () => {
    // The bug this exists to prevent: Weather Ops and Scheduling are different
    // components behind one pathname.
    expect(boundaryKey("/admin/calendar", "?tab=weather")).not.toBe(
      boundaryKey("/admin/calendar", "")
    );
    expect(boundaryKey("/admin/clients", "?tab=messages")).not.toBe(
      boundaryKey("/admin/clients", "")
    );
    expect(boundaryKey("/admin/pipeline/leads", "?tab=calls")).not.toBe(
      boundaryKey("/admin/pipeline/leads", "?tab=leads")
    );
  });

  it("does NOT change for filter params", () => {
    const base = boundaryKey("/admin/missions", "");
    expect(boundaryKey("/admin/missions", "?delivery=ready")).toBe(base);
    expect(boundaryKey("/admin/missions", "?pilot=p1&delivery=ready")).toBe(base);
  });

  it("does NOT change for deep-link params inside a tab", () => {
    // Stored notification links carry ?conversation=<uuid> into the messages
    // tab. Remounting per conversation would throw away the loaded thread.
    const tab = boundaryKey("/admin/clients", "?tab=messages");
    expect(boundaryKey("/admin/clients", "?tab=messages&conversation=abc")).toBe(tab);
    expect(boundaryKey("/admin/clients", "?tab=messages&conversation=def")).toBe(tab);
  });

  it("does NOT change for the OAuth ?code= handoff", () => {
    // Google redirects the whole browser to /admin/settings?code=... and
    // IntegrationsSettings exchanges it on mount. A remount mid-exchange would
    // fire the exchange twice.
    expect(boundaryKey("/admin/settings", "?code=4/abc")).toBe(
      boundaryKey("/admin/settings", "")
    );
  });

  it("is order-independent within the search string", () => {
    expect(boundaryKey("/admin/calendar", "?tab=weather&pilot=p1")).toBe(
      boundaryKey("/admin/calendar", "?pilot=p1&tab=weather")
    );
  });

  it("treats an absent tab the same as an empty one", () => {
    expect(boundaryKey("/admin/clients", "?tab=")).toBe(boundaryKey("/admin/clients", ""));
  });
});
