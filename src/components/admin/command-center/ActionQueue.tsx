import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { WorkItem } from "@/types/command-center";
import { getActionReason, sortOwnerActionItems } from "./action-queue";

interface ActionQueueProps {
  items: readonly WorkItem[];
  isLoading?: boolean;
  error?: Error | null;
  now?: Date;
  onSelect?: (item: WorkItem) => void;
  onRetry?: () => void;
}

function LoadingState() {
  return (
    <div role="status" aria-label="Loading owner actions" className="space-y-3 px-5 pb-5">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function ActionQueue({
  items,
  isLoading = false,
  error,
  now = new Date(),
  onSelect,
  onRetry,
}: ActionQueueProps) {
  const ownerActions = sortOwnerActionItems(items, now);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.5)]">
      <header className="flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <CircleAlert className="size-4" />
            </span>
            <h2 className="text-lg font-semibold">Needs your action</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Decisions and exceptions that cannot move without you.
          </p>
        </div>
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {isLoading ? "—" : ownerActions.length}
        </span>
      </header>

      {isLoading && <LoadingState />}

      {!isLoading && error && (
        <div className="mx-5 mb-5 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-950 sm:mx-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Owner actions are unavailable</p>
              <p className="mt-1 text-sm text-rose-800">Other command center sections will keep working.</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onRetry}>
                <RefreshCw className="size-3.5" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !error && ownerActions.length === 0 && (
        <div className="mx-5 mb-5 flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:mx-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-emerald-950">Nothing needs your decision right now</p>
            <p className="mt-1 text-sm text-emerald-800">The company can keep moving without an owner intervention.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && ownerActions.length > 0 && (
        <div className="divide-y divide-border/70 border-t border-border/70">
          {ownerActions.map((item) => {
            const reason = getActionReason(item, now);
            if (!reason) return null;
            const Icon = reason.icon;
            return (
              <div key={item.id} className="group flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:px-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border/70 bg-background text-foreground shadow-sm">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{item.title}</p>
                    <Badge variant="outline" className={cn("font-medium", reason.className)}>
                      {reason.label}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="capitalize">{item.department}</span>
                    <span aria-hidden>•</span>
                    <span>{item.owner_id ? "Assigned" : "Unassigned"}</span>
                    {item.due_at && (
                      <>
                        <span aria-hidden>•</span>
                        <span>Due {format(new Date(item.due_at), "MMM d, h:mm a")}</span>
                      </>
                    )}
                    <span aria-hidden>•</span>
                    <span className="capitalize">{item.source_system}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 self-start sm:self-auto"
                  aria-label={`${reason.action} ${item.title}`}
                  onClick={() => onSelect?.(item)}
                >
                  {reason.action}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
