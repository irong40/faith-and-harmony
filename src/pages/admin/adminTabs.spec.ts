import { describe, it, expect } from "vitest";
import { resolveClientTab } from "./Clients";
import { resolveCalendarTab } from "./CalendarOps";

// ---------------------------------------------------------------------------
// Tab resolvers for the pages that absorbed a retired route.
//
// These are URL contracts, not view state. Five edge functions write
// notifications.link = '/admin/messages?conversation=<uuid>' and that link
// redirects into /admin/clients?tab=messages&conversation=<uuid>; likewise
// /admin/weather redirects into /admin/calendar?tab=weather. If a resolver
// falls back to the wrong panel the link still "works" — it just silently
// shows the wrong thing, which is the failure mode hardest to notice.
// ---------------------------------------------------------------------------

describe("resolveClientTab", () => {
  it("defaults to the client directory", () => {
    expect(resolveClientTab(null)).toBe("clients");
  });

  it("opens Messages for the retired /admin/messages redirect", () => {
    expect(resolveClientTab("messages")).toBe("messages");
  });

  it("ignores an unknown tab rather than rendering nothing", () => {
    expect(resolveClientTab("archive")).toBe("clients");
  });
});

describe("resolveCalendarTab", () => {
  it("defaults to the schedule", () => {
    expect(resolveCalendarTab(null)).toBe("schedule");
  });

  it("opens Weather for the retired /admin/weather redirect", () => {
    expect(resolveCalendarTab("weather")).toBe("weather");
  });

  it("ignores an unknown tab rather than rendering nothing", () => {
    expect(resolveCalendarTab("forecast")).toBe("schedule");
  });
});
