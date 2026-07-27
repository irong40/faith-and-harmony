import { useState } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import WorkItemDrawer from "@/components/admin/command-center/WorkItemDrawer";
import WorkBoard from "@/components/admin/work/WorkBoard";
import WorkFilters from "@/components/admin/work/WorkFilters";
import { Button } from "@/components/ui/button";
import { useUpdateWorkItem, useWorkItems } from "@/hooks/useWorkItems";
import type { WorkItem, WorkItemFilters, WorkItemStatus } from "@/types/command-center";

export default function Work() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<WorkItemFilters>({});
  const [view, setView] = useState<"board" | "list">("board");
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(searchParams.get("create") === "1");
  const workItems = useWorkItems(filters);
  const updateMutation = useUpdateWorkItem();

  const openNew = () => {
    setSelectedItem(null);
    setDrawerOpen(true);
  };

  const openItem = (item: WorkItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const changeDrawer = (open: boolean) => {
    setDrawerOpen(open);
    if (!open && searchParams.has("create")) {
      const next = new URLSearchParams(searchParams);
      next.delete("create");
      setSearchParams(next, { replace: true });
    }
  };

  const moveItem = async (item: WorkItem, status: WorkItemStatus) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        input: { status, version: item.version },
      });
    } catch {
      toast.error("Status change was rolled back. Try again.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
      <section className="mb-8 flex flex-col gap-5 border-b border-border/70 pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Operational authority
          </p>
          <h1 className="text-3xl font-bold tracking-[-0.035em] text-foreground md:text-4xl">
            Company work
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Plan, assign, approve, and close work across every department.
          </p>
        </div>
        <Button className="gap-2 self-start sm:self-auto" onClick={openNew}>
          <Plus className="size-4" />
          New work
        </Button>
      </section>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <WorkFilters value={filters} onChange={setFilters} />
        <div className="flex items-center gap-1 self-start rounded-lg border bg-card p-1">
          <Button
            type="button"
            variant={view === "board" ? "secondary" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => setView("board")}
          >
            <LayoutGrid className="size-3.5" />
            Board
          </Button>
          <Button
            type="button"
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => setView("list")}
          >
            <List className="size-3.5" />
            List
          </Button>
        </div>
      </div>

      <WorkBoard
        items={workItems.data ?? []}
        view={view}
        isLoading={workItems.isLoading}
        error={workItems.error instanceof Error ? workItems.error : null}
        onRetry={() => workItems.refetch()}
        onSelect={openItem}
        onMove={moveItem}
      />

      <WorkItemDrawer open={drawerOpen} onOpenChange={changeDrawer} item={selectedItem} />
    </main>
  );
}
