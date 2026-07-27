import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CircleDollarSign,
  FileCheck2,
  Send,
  ShieldAlert,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  BusinessPulseMetrics,
  BusinessPulseSnapshot,
  PulseMetric,
} from "@/lib/command-center/business-pulse";

interface BusinessPulseProps {
  snapshot?: BusinessPulseSnapshot;
  isLoading?: boolean;
  error?: Error | null;
}

interface MetricDefinition {
  key: keyof BusinessPulseMetrics;
  label: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  currency?: boolean;
}

const metrics: readonly MetricDefinition[] = [
  { key: "openLeads", label: "Open leads", detail: "Need qualification", href: "/admin/leads", icon: Target },
  { key: "openQuotes", label: "Open quotes", detail: "Not yet decided", href: "/admin/quote-requests", icon: FileCheck2 },
  { key: "activeJobs", label: "Active jobs", detail: "Real missions only", href: "/admin/drone-jobs", icon: BriefcaseBusiness },
  { key: "pendingDeliveries", label: "Ready to deliver", detail: "Client handoff pending", href: "/admin/drone-jobs?delivery=ready", icon: Send },
  { key: "outstandingRevenue", label: "Outstanding revenue", detail: "Pending and overdue payments", href: "/admin/invoices", icon: CircleDollarSign, currency: true },
  { key: "overdueCompliance", label: "Compliance overdue", detail: "Past due obligations", href: "/admin/governance", icon: ShieldAlert },
] as const;

function formatMetric(metric: PulseMetric, currency = false): string {
  if (metric.value === null) return "—";
  if (currency) return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(metric.value);
  return metric.value.toLocaleString("en-US");
}

export default function BusinessPulse({ snapshot, isLoading = false, error }: BusinessPulseProps) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.5)]">
      <header className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <CircleDollarSign className="size-4" />
            </span>
            <h2 className="text-lg font-semibold">Business pulse</h2>
          </div>
          <p className="text-sm text-muted-foreground">Live signals from revenue, delivery, and governance.</p>
        </div>
        {snapshot && (
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            Live
          </span>
        )}
      </header>

      {isLoading && (
        <div role="status" aria-label="Loading business pulse" className="grid border-t sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.key} className="space-y-3 border-b border-r p-5">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="border-t p-6 text-sm text-rose-800">
          Business pulse is unavailable. The other company views are still active.
        </div>
      )}

      {!isLoading && !error && snapshot && (
        <div className="grid border-t border-border/70 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((definition) => {
            const metric = snapshot.metrics[definition.key];
            const Icon = definition.icon;
            return (
              <Link
                key={definition.key}
                to={definition.href}
                className="group min-h-40 border-b border-border/70 p-5 outline-none ring-inset ring-ring transition-colors hover:bg-muted/20 focus-visible:ring-2 sm:border-r sm:[&:nth-child(even)]:border-r-0 xl:[&:nth-child(even)]:border-r xl:[&:nth-child(3n)]:border-r-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-9 place-items-center rounded-xl border bg-background text-foreground shadow-sm">
                    <Icon className="size-4" />
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
                <p className="mt-5 font-mono text-3xl font-semibold tracking-tight tabular-nums">
                  {formatMetric(metric, definition.currency)}
                </p>
                <p className="mt-1 text-sm font-semibold">{definition.label}</p>
                {metric.error ? (
                  <p className="mt-1 text-xs font-medium text-rose-700">{metric.error}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{definition.detail}</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
