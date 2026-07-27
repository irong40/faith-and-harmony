import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Building2,
  CircleDashed,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getDepartmentReportState } from "@/lib/command-center/departments";
import {
  DEPARTMENTS,
  type DepartmentUpdate,
} from "@/types/command-center";

interface DepartmentHealthProps {
  updates: readonly DepartmentUpdate[];
  isLoading?: boolean;
  error?: Error | null;
  now?: Date;
  onRetry?: () => void;
}

const stateStyles = {
  healthy: { label: "Healthy", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  watch: { label: "Watch", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-900 border-amber-200" },
  blocked: { label: "Blocked", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-900 border-rose-200" },
  stale: { label: "Stale report", dot: "bg-slate-400", badge: "bg-slate-50 text-slate-700 border-slate-200" },
  missing: { label: "No report", dot: "bg-slate-300", badge: "bg-slate-50 text-slate-600 border-slate-200" },
} as const;

export default function DepartmentHealth({
  updates,
  isLoading = false,
  error,
  now = new Date(),
  onRetry,
}: DepartmentHealthProps) {
  const byDepartment = new Map(updates.map((update) => [update.department, update]));

  return (
    <section className="rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.5)]">
      <header className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Building2 className="size-4" />
            </span>
            <h2 className="text-lg font-semibold">Department health</h2>
          </div>
          <p className="text-sm text-muted-foreground">Current objective, health, and blockers for each company function.</p>
        </div>
        <Activity className="mt-1 size-5 text-muted-foreground" />
      </header>

      {error && !isLoading && (
        <div className="mx-5 mb-5 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-950 sm:mx-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5" />
            <div className="flex-1">
              <p className="font-semibold">Department reports are unavailable</p>
              <p className="mt-1 text-sm text-rose-800">Work and owner actions will continue loading.</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onRetry}>
                <RefreshCw className="size-3.5" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {!error && (
        <div className="grid border-t border-border/70 sm:grid-cols-2 xl:grid-cols-4">
          {DEPARTMENTS.map((department) => {
            const update = byDepartment.get(department);
            const state = getDepartmentReportState(update, now);
            const style = stateStyles[state];
            return (
              <article
                key={department}
                data-testid="department-card"
                data-department={department}
                className="min-h-48 border-b border-border/70 p-5 last:border-b-0 sm:border-r sm:[&:nth-child(even)]:border-r-0 xl:[&:nth-child(even)]:border-r xl:[&:nth-child(4n)]:border-r-0"
              >
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="capitalize">{department}</h3>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide", style.badge)}>
                        <span className={cn("size-1.5 rounded-full", style.dot)} />
                        {style.label}
                      </span>
                    </div>
                    {update ? (
                      <>
                        <p className="mt-4 line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                          {update.objective || "No objective reported"}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {update.summary}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className={cn(update.blockers.length > 0 && "font-semibold text-rose-700")}>
                            {update.blockers.length} {update.blockers.length === 1 ? "blocker" : "blockers"}
                          </span>
                          <span>{formatDistanceToNow(new Date(update.reported_at), { addSuffix: true })}</span>
                        </div>
                      </>
                    ) : (
                      <div className="mt-5 flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                        <CircleDashed className="size-4" />
                        Awaiting department update
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
