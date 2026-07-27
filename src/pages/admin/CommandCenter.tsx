import { useState } from "react";
import { Clock3 } from "lucide-react";
import ActionQueue from "@/components/admin/command-center/ActionQueue";
import WorkItemDrawer from "@/components/admin/command-center/WorkItemDrawer";
import { useWorkItems } from "@/hooks/useWorkItems";
import type { WorkItem } from "@/types/command-center";

const ACTIVE_WORK_STATUSES = [
  "inbox",
  "planned",
  "in_progress",
  "waiting",
  "blocked",
  "needs_approval",
] as const;

export default function CommandCenter() {
  const workItems = useWorkItems({ statuses: ACTIVE_WORK_STATUSES });
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openItem = (item: WorkItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
      <section className="mb-8 flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_hsl(142_71%_45%/0.12)]" />
            Operating picture
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-foreground md:text-4xl">
            Company command center
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            See what needs your decision, where work is moving, and which part of the company needs attention.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-4" />
          Live company status
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <ActionQueue
          items={workItems.data ?? []}
          isLoading={workItems.isLoading}
          error={workItems.error instanceof Error ? workItems.error : null}
          onRetry={() => workItems.refetch()}
          onSelect={openItem}
        />

        <section className="rounded-2xl border border-border/80 bg-primary p-6 text-primary-foreground shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.6)]">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/65">
            Owner focus
          </p>
          <p className="mt-8 font-mono text-5xl font-semibold tabular-nums">
            {workItems.isLoading ? "—" : (workItems.data?.length ?? 0)}
          </p>
          <h2 className="mt-2 text-lg font-semibold">Open company items</h2>
          <p className="mt-2 text-sm leading-6 text-primary-foreground/70">
            The decision queue filters this operating backlog to the exceptions that need you now.
          </p>
        </section>
      </div>

      <WorkItemDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={selectedItem}
      />
    </main>
  );
}
