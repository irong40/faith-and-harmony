// ---------------------------------------------------------------------------
// Office reports — types and pure helpers for /admin/reports/office.
//
// The agent office posts its reports to the table `office_reports`. Staff
// meeting minutes come first: one row per Friday meeting, with the Markdown
// the meeting wrote and, when one exists, its letterhead HTML copy. The
// desktop sync (office_dashboard_sync.py) is the only writer.
// ---------------------------------------------------------------------------

/** What the list needs. Bodies are fetched one at a time. */
export interface OfficeReportSummary {
  id: string;
  kind: string;
  /** YYYY-MM-DD */
  report_date: string;
  title: string;
  summary: string | null;
  updated_at: string;
}

export interface OfficeReportBody {
  id: string;
  body_md: string | null;
  body_html: string | null;
  source_path: string;
}

const KIND_LABEL: Record<string, string> = {
  "staff-meeting": "Staff meeting",
};

/** "staff-meeting" -> "Staff meeting". An unknown kind reads as its own words. */
export function kindLabel(kind: string): string {
  if (KIND_LABEL[kind]) return KIND_LABEL[kind];
  const words = (kind || "report").replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function parseDay(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? "")) return null;
  // Noon UTC: the date must not slip a day in any time zone the page is read in.
  const d = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Friday, September 11, 2026". A bad date comes back unchanged, never "Invalid Date". */
export function longDate(day: string): string {
  const d = parseDay(day);
  if (!d) return day || "";
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

/** "Sep 11" */
export function shortDate(day: string): string {
  const d = parseDay(day);
  if (!d) return day || "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function monthLabel(day: string): string {
  const d = parseDay(day);
  if (!d) return "Undated";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" });
}

export interface ReportMonth {
  month: string;
  reports: OfficeReportSummary[];
}

/** Keeps the order it is given (the query returns newest first) and breaks it at each month. */
export function groupByMonth(reports: OfficeReportSummary[]): ReportMonth[] {
  const out: ReportMonth[] = [];
  for (const report of reports) {
    const month = monthLabel(report.report_date);
    const last = out[out.length - 1];
    if (last && last.month === month) last.reports.push(report);
    else out.push({ month, reports: [report] });
  }
  return out;
}

/** The report the URL names, or the newest one when it names none or one that is gone. */
export function pickReport(reports: OfficeReportSummary[], id: string | null | undefined): OfficeReportSummary | null {
  if (!reports.length) return null;
  return reports.find((r) => r.id === id) ?? reports[0];
}

/** Minutes start with a YAML block of tags. It is bookkeeping, not part of the minutes. */
export function stripFrontMatter(md: string): string {
  return (md ?? "").replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").replace(/^\s+/, "");
}

const FRAME_STYLE =
  "<style>html{background:#fff}body{padding:28px 36px !important;max-width:60rem;margin:0 auto !important}</style>";

/**
 * The letterhead copy is laid out for paper: its margins come from @page, which a
 * screen ignores, so the text ran to the edge of the frame. This adds screen
 * padding. It adds a style rule only; the frame's empty sandbox is what keeps
 * the document from running anything.
 */
export function framedHtml(html: string): string {
  const doc = html ?? "";
  return /<\/head>/i.test(doc) ? doc.replace(/<\/head>/i, `${FRAME_STYLE}</head>`) : doc + FRAME_STYLE;
}

/** Only web and mail links are followed. Anything else is shown as plain text. */
export function safeHref(href: string): string | null {
  return /^(https:\/\/|http:\/\/|mailto:|tel:)/i.test(href ?? "") ? href : null;
}
