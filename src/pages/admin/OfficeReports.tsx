import { useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Radar, RefreshCw, ScrollText } from "lucide-react";
import PageShell from "@/components/admin/PageShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/PageState";
import ReportMarkdown from "@/components/admin/ReportMarkdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOfficeReportBody, useOfficeReports } from "@/hooks/useOfficeReports";
import { ago, isAccessNotGranted } from "@/lib/office";
import { groupByMonth, kindLabel, longDate, pickReport, shortDate, type OfficeReportSummary } from "@/lib/officeReports";

// ---------------------------------------------------------------------------
// Office reports — what the agent office files for Adam to read. Staff meeting
// minutes first: the office posts each Friday's minutes here after the meeting.
//
// Read only. The desktop sync is the only writer, and the table lets an admin
// read and nothing else. The selected report lives in the URL (?report=<id>)
// so a link to one set of minutes can be kept or sent.
// ---------------------------------------------------------------------------

type View = "formatted" | "text";

function ReportList({
  reports,
  selectedId,
  onSelect,
}: {
  reports: OfficeReportSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Reports" className="space-y-5 lg:max-h-[80vh] lg:overflow-y-auto lg:pr-1">
      {groupByMonth(reports).map((group) => (
        <div key={group.month}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.month}</p>
          <ul className="space-y-2">
            {group.reports.map((report) => {
              const selected = report.id === selectedId;
              return (
                <li key={report.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(report.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors",
                      selected ? "border-primary bg-accent" : "bg-card hover:bg-accent/60"
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{kindLabel(report.kind)}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{shortDate(report.report_date)}</span>
                    </span>
                    {report.summary && (
                      <span className="mt-1 line-clamp-2 block break-words text-xs text-muted-foreground">{report.summary}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function ReportViewer({ report }: { report: OfficeReportSummary }) {
  const { data, error, isLoading, refetch } = useOfficeReportBody(report.id);
  const [view, setView] = useState<View>("formatted");

  if (isLoading) return <LoadingState variant="detail" rows={4} label="Loading the report" />;
  if (error) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load this report" />;
  if (!data || (!data.body_html && !data.body_md)) {
    return <EmptyState icon={ScrollText} title="This report has no text" description="The office posted a title and nothing under it." />;
  }

  const both = Boolean(data.body_html && data.body_md);
  const showHtml = Boolean(data.body_html) && (view === "formatted" || !data.body_md);

  return (
    <div>
      {both && (
        <div className="mb-3 flex gap-2" role="group" aria-label="How to show the report">
          <Button size="sm" variant={showHtml ? "default" : "outline"} onClick={() => setView("formatted")} aria-pressed={showHtml}>
            Letterhead
          </Button>
          <Button size="sm" variant={showHtml ? "outline" : "default"} onClick={() => setView("text")} aria-pressed={!showHtml}>
            Plain text
          </Button>
        </div>
      )}
      {showHtml ? (
        // The office wrote this HTML. An empty `sandbox` means no script runs,
        // no form posts, and the frame cannot reach this page or its session.
        <iframe
          title={`${report.title}, as written`}
          sandbox=""
          srcDoc={data.body_html ?? ""}
          className="h-[80vh] w-full rounded-lg border bg-white"
        />
      ) : (
        <div className="rounded-lg border bg-card p-5">
          <ReportMarkdown source={data.body_md ?? ""} />
        </div>
      )}
      <p className="mt-2 break-all font-mono text-xs text-muted-foreground">Source: {data.source_path}</p>
    </div>
  );
}

export default function OfficeReports() {
  const { data, error, isLoading, isFetching, refetch } = useOfficeReports();
  const [params, setParams] = useSearchParams();

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
        <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        Refresh
      </Button>
      <Button asChild variant="ghost" size="sm" className="gap-2">
        <Link to="/admin/office">
          <Radar className="h-4 w-4" />
          Office
        </Link>
      </Button>
    </div>
  );

  const shell = (children: ReactNode) => (
    <PageShell
      title="Office reports"
      description="Staff meeting minutes. The office posts each Friday's minutes here after the meeting."
      icon={ScrollText}
      width="wide"
      breadcrumbs={[{ label: "Reports", href: "/admin/reports" }, { label: "Office reports" }]}
      actions={actions}
    >
      {children}
    </PageShell>
  );

  if (isLoading) return shell(<LoadingState variant="list" rows={5} label="Loading the reports" />);

  if (error && !data) {
    return shell(
      isAccessNotGranted(error) ? (
        <EmptyState
          icon={ScrollText}
          title="Report access is not turned on yet"
          description="The database rule that lets an admin read office reports has not been applied. Nothing is wrong with your login."
        />
      ) : (
        <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load the reports" />
      )
    );
  }

  const reports = data ?? [];
  if (reports.length === 0) {
    return shell(
      <EmptyState
        icon={ScrollText}
        title="No reports yet"
        description="The office posts the minutes after each Friday staff meeting. They appear here within a few minutes of the desktop's next report."
      />
    );
  }

  const selected = pickReport(reports, params.get("report"));
  const select = (id: string) => setParams({ report: id }, { replace: false });

  return shell(
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <ReportList reports={reports} selectedId={selected?.id ?? null} onSelect={select} />
      {selected && (
        <section aria-label="Selected report" className="min-w-0">
          <header className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">{selected.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {longDate(selected.report_date)} · posted {ago(selected.updated_at)}
            </p>
            {selected.summary && <p className="mt-2 break-words text-sm">{selected.summary}</p>}
          </header>
          {/* The key resets the Letterhead / Plain text choice when another report is opened. */}
          <ReportViewer key={selected.id} report={selected} />
        </section>
      )}
    </div>
  );
}
