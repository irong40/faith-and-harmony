import { describe, expect, it } from "vitest";
import {
  groupByMonth,
  kindLabel,
  longDate,
  monthLabel,
  pickReport,
  safeHref,
  shortDate,
  stripFrontMatter,
  type OfficeReportSummary,
} from "./officeReports";

const report = (id: string, day: string): OfficeReportSummary => ({
  id,
  kind: "staff-meeting",
  report_date: day,
  title: `Staff meeting ${day}`,
  summary: null,
  updated_at: `${day}T15:00:00Z`,
});

describe("kindLabel", () => {
  it("names the kinds the office posts and reads an unknown kind as its own words", () => {
    expect(kindLabel("staff-meeting")).toBe("Staff meeting");
    expect(kindLabel("content-performance")).toBe("Content performance");
    expect(kindLabel("")).toBe("Report");
  });
});

describe("dates", () => {
  it("shows the meeting's own day, never the day before", () => {
    // A Friday. Parsed as local midnight this reads "Thursday" west of UTC.
    expect(longDate("2026-09-11")).toBe("Friday, September 11, 2026");
    expect(shortDate("2026-09-11")).toBe("Sep 11");
    expect(monthLabel("2026-09-11")).toBe("September 2026");
    expect(longDate("2026-01-01")).toBe("Thursday, January 1, 2026");
  });

  it("returns a bad date as it came, not 'Invalid Date'", () => {
    expect(longDate("soon")).toBe("soon");
    expect(shortDate("")).toBe("");
    expect(monthLabel("2026-13-45")).toBe("Undated");
  });
});

describe("groupByMonth", () => {
  it("keeps newest first and breaks at each month", () => {
    const groups = groupByMonth([report("c", "2026-09-11"), report("b", "2026-09-04"), report("a", "2026-08-28")]);
    expect(groups.map((g) => g.month)).toEqual(["September 2026", "August 2026"]);
    expect(groups[0].reports.map((r) => r.id)).toEqual(["c", "b"]);
    expect(groupByMonth([])).toEqual([]);
  });
});

describe("pickReport", () => {
  const list = [report("new", "2026-09-11"), report("old", "2026-09-04")];
  it("opens the report the link names", () => {
    expect(pickReport(list, "old")?.id).toBe("old");
  });
  it("opens the newest when the link names none, or one that is gone", () => {
    expect(pickReport(list, null)?.id).toBe("new");
    expect(pickReport(list, "deleted")?.id).toBe("new");
    expect(pickReport([], "old")).toBeNull();
  });
});

describe("stripFrontMatter", () => {
  it("drops the tag block the minutes start with, on either kind of line ending", () => {
    expect(stripFrontMatter("---\ntags: [meeting]\ndate: 2026-09-11\n---\n\n# Staff Meeting\n")).toBe("# Staff Meeting\n");
    expect(stripFrontMatter("---\r\ntags: [meeting]\r\n---\r\n# Staff Meeting")).toBe("# Staff Meeting");
  });
  it("leaves a report with no tag block alone, including one that only has a rule in it", () => {
    expect(stripFrontMatter("# Staff Meeting\n\n---\n\nBody")).toBe("# Staff Meeting\n\n---\n\nBody");
  });
});

describe("safeHref", () => {
  it("follows web and mail links only", () => {
    expect(safeHref("https://sam.gov/opp/1")).toBe("https://sam.gov/opp/1");
    expect(safeHref("mailto:info@faithandharmonyllc.com")).toBe("mailto:info@faithandharmonyllc.com");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>1</script>")).toBeNull();
    expect(safeHref("/admin/office")).toBeNull();
  });
});
