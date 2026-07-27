import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { WorkItem, WorkItemStatus } from "@/types/command-center";

const BOARD_STATUSES = [
  "inbox",
  "planned",
  "in_progress",
  "waiting",
  "blocked",
  "needs_approval",
  "done",
] as const;

const statusLabels: Record<(typeof BOARD_STATUSES)[number], string> = {
  inbox: "Inbox",
  planned: "Planned",
  in_progress: "In progress",
  waiting: "Waiting",
  blocked: "Blocked",
  needs_approval: "Needs approval",
  done: "Done",
};

const statusAccent: Record<(typeof BOARD_STATUSES)[number], string> = {
  inbox: "bg-slate-400",
  planned: "bg-blue-500",
  in_progress: "bg-violet-500",
  waiting: "bg-amber-500",
  blocked: "bg-rose-500",
  needs_approval: "bg-orange-500",
  done: "bg-emerald-500",
};

const priorityOrder: Record<WorkItem["priority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

interface WorkBoardProps {
  items: readonly WorkItem[];
  view?: "board" | "list";
  isLoading?: boolean;
  error?: Error | null;
  onSelect?: (item: WorkItem) => void;
  onMove?: (item: WorkItem, status: WorkItemStatus) => void;
  onRetry?: () => void;
}

function ordered(items: readonly WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => (
    priorityOrder[a.priority] - priorityOrder[b.priority]
    || (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999")
    || a.created_at.localeCompare(b.created_at)
  ));
}

function MovementControls({ item, onMove }: Pick<WorkBoardProps, "onMove"> & { item: WorkItem }) {
  const index = BOARD_STATUSES.indexOf(item.status as (typeof BOARD_STATUSES)[number]);
  if (index < 0 || !onMove) return null;
  const previous = BOARD_STATUSES[index - 1];
  const next = BOARD_STATUSES[index + 1];

  return (
    <div className="flex items-center gap-1">
      {previous && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Move ${item.title} back`}
          title={`Move to ${statusLabels[previous]}`}
          onClick={() => onMove(item, previous)}
        >
          <ArrowLeft className="size-3.5" />
        </Button>
      )}
      {next && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Move ${item.title} forward`}
          title={`Move to ${statusLabels[next]}`}
          onClick={() => onMove(item, next)}
        >
          <ArrowRight className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

function WorkCard({ item, onSelect, onMove }: Pick<WorkBoardProps, "onSelect" | "onMove"> & { item: WorkItem }) {
  return (
    <article className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn("h-1", statusAccent[item.status as keyof typeof statusAccent] ?? "bg-slate-400")} />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="capitalize">{item.item_type}</Badge>
          <span className={cn(
            "font-mono text-[9px] font-semibold uppercase tracking-wide",
            item.priority === "urgent" && "text-rose-700",
            item.priority === "high" && "text-orange-700",
            (item.priority === "normal" || item.priority === "low") && "text-muted-foreground",
          )}>
            {item.priority}
          </span>
        </div>
        <button
          type="button"
          className="mt-3 w-full text-left text-sm font-semibold leading-5 outline-none ring-ring focus-visible:rounded focus-visible:ring-2"
          aria-label={`Open ${item.title}`}
          onClick={() => onSelect?.(item)}
        >
          {item.title}
        </button>
        <p className="mt-2 text-[11px] font-medium capitalize text-muted-foreground">{item.department}</p>
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
          <div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground">
            {item.due_at ? (
              <><CalendarClock className="size-3" /><span className="truncate">{format(new Date(item.due_at), "MMM d")}</span></>
            ) : (
              <><UserRound className="size-3" /><span>{item.owner_id ? "Assigned" : "Unassigned"}</span></>
            )}
          </div>
          <MovementControls item={item} onMove={onMove} />
        </div>
      </div>
    </article>
  );
}

function LoadingBoard() {
  return (
    <div role="status" aria-label="Loading company work" className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
      {[0, 1, 2, 3, 4].map((column) => (
        <div key={column} className="space-y-3 rounded-xl border bg-card/70 p-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ))}
    </div>
  );
}

function WorkList({ items, onSelect, onMove }: Pick<WorkBoardProps, "items" | "onSelect" | "onMove">) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[760px] text-sm" aria-label="Company work list">
        <thead className="border-b bg-muted/30 text-left text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-semibold">Work</th>
            <th className="px-4 py-3 font-semibold">Department</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Priority</th>
            <th className="px-4 py-3 font-semibold">Due</th>
            <th className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ordered(items).map((item) => (
            <tr key={item.id} className="hover:bg-muted/20">
              <td className="px-4 py-3">
                <button type="button" className="font-semibold outline-none hover:underline focus-visible:underline" aria-label={`Open ${item.title}`} onClick={() => onSelect?.(item)}>
                  {item.title}
                </button>
                <p className="mt-1 text-xs capitalize text-muted-foreground">{item.item_type}</p>
              </td>
              <td className="px-4 py-3 capitalize">{item.department}</td>
              <td className="px-4 py-3 capitalize">{item.status.replace("_", " ")}</td>
              <td className="px-4 py-3 capitalize">{item.priority}</td>
              <td className="px-4 py-3">{item.due_at ? format(new Date(item.due_at), "MMM d, yyyy") : "—"}</td>
              <td className="px-4 py-3"><MovementControls item={item} onMove={onMove} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WorkBoard({
  items,
  view = "board",
  isLoading = false,
  error,
  onSelect,
  onMove,
  onRetry,
}: WorkBoardProps) {
  if (isLoading) return <LoadingBoard />;

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5" />
          <div>
            <p className="font-semibold">Company work is unavailable</p>
            <p className="mt-1 text-sm text-rose-800">Your current filters are safe. Try loading the board again.</p>
            {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
          </div>
        </div>
      </div>
    );
  }

  if (view === "list") return <WorkList items={items} onSelect={onSelect} onMove={onMove} />;

  return (
    <div className="overflow-x-auto pb-3">
      <div className="grid min-w-[1780px] grid-cols-7 gap-3">
        {BOARD_STATUSES.map((status) => {
          const columnItems = ordered(items.filter((item) => item.status === status));
          return (
            <section key={status} aria-label={`${statusLabels[status]} work`} className="rounded-xl border border-border/70 bg-muted/15 p-2.5">
              <header className="mb-3 flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", statusAccent[status])} />
                  <h3 className="text-sm">{statusLabels[status]}</h3>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{columnItems.length}</span>
              </header>
              <div className="space-y-2.5">
                {columnItems.map((item) => <WorkCard key={item.id} item={item} onSelect={onSelect} onMove={onMove} />)}
                {columnItems.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border/80 px-3 py-8 text-center text-xs text-muted-foreground">No work</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
