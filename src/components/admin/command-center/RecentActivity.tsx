import { formatDistanceToNow } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  History,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecentActivityItem, RecentActivitySnapshot } from "@/lib/command-center/recent-activity";

interface RecentActivityProps {
  snapshot?: RecentActivitySnapshot;
  isLoading?: boolean;
  error?: Error | null;
}

const sourceConfig: Record<RecentActivityItem["source"], { icon: LucideIcon; label: string; className: string }> = {
  work: { icon: ClipboardCheck, label: "Work", className: "bg-violet-100 text-violet-800" },
  governance: { icon: ShieldCheck, label: "Governance", className: "bg-emerald-100 text-emerald-800" },
  operations: { icon: BriefcaseBusiness, label: "Operations", className: "bg-blue-100 text-blue-800" },
  revenue: { icon: CircleDollarSign, label: "Revenue", className: "bg-amber-100 text-amber-900" },
};

export default function RecentActivity({ snapshot, isLoading = false, error }: RecentActivityProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.5)]">
      <header className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-accent-foreground">
              <History className="size-4" />
            </span>
            <h2 className="text-lg font-semibold">Recent activity</h2>
          </div>
          <p className="text-sm text-muted-foreground">What changed across the company.</p>
        </div>
        {snapshot && snapshot.errors.length > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
            {snapshot.errors.length} {snapshot.errors.length === 1 ? "activity source" : "activity sources"} unavailable
          </span>
        )}
      </header>

      {isLoading && (
        <div role="status" aria-label="Loading recent activity" className="space-y-1 border-t px-5 py-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3 py-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /></div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="border-t px-6 py-8 text-sm text-rose-800">Recent activity is unavailable.</div>
      )}

      {!isLoading && !error && snapshot?.items.length === 0 && (
        <div className="border-t px-6 py-10 text-center">
          <Activity className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 font-semibold">No company activity yet</p>
          <p className="mt-1 text-sm text-muted-foreground">New work and CRM changes will appear here.</p>
        </div>
      )}

      {!isLoading && !error && snapshot && snapshot.items.length > 0 && (
        <div className="divide-y border-t">
          {snapshot.items.map((item) => {
            const source = sourceConfig[item.source];
            const Icon = source.icon;
            return (
              <Link key={item.id} to={item.href} className="group flex items-center gap-3 px-5 py-3.5 outline-none ring-inset ring-ring transition-colors hover:bg-muted/20 focus-visible:ring-2 sm:px-6">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${source.className}`}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.detail} · {source.label}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(item.occurredAt), { addSuffix: true })}</span>
                  <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
