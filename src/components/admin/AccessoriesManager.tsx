import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, Pencil, Trash2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAllAccessories } from "@/hooks/useFleet";
import { useDeleteAccessory } from "@/hooks/useFleetMutations";
import AccessoryFormDialog from "@/components/admin/AccessoryFormDialog";
import { LoadingState, EmptyState } from "@/components/admin/PageState";
import type { Accessory } from "@/types/fleet";

// ---------------------------------------------------------------------------
// AccessoriesManager — the ONE accessories UI.
//
// The admin Accessories page and the Fleet inventory page were two different
// renderings of the same `useAllAccessories` rows, backed by two copies of
// AccessoryFormDialog that had already drifted: the pilot copy took compatible
// aircraft as a comma-separated free-text string, the admin copy as checkboxes
// over the real aircraft table. A typo in the free-text field produced a
// compatibility entry matching no aircraft, with nothing to flag it. The
// checkbox version is the survivor and this component is its only caller.
//
// Table above md, cards below — one component, no second implementation.
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500 text-white",
  maintenance: "bg-amber-500 text-white",
  retired: "bg-gray-400 text-white",
  planned: "bg-blue-500 text-white",
  lost: "bg-red-500 text-white",
};

export interface AccessoriesManagerProps {
  /**
   * Supplied by the fleet view, which owns the maintenance log dialog. Omitted
   * on the settings page, where the per-row maintenance button is not offered.
   */
  onLogMaintenance?: (accessory: Accessory) => void;
  /** Lets the parent drive "Add accessory" from its own page header. */
  openFormSignal?: number;
}

function statusBadge(status: string) {
  return STATUS_COLORS[status] ?? "bg-gray-400 text-white";
}

export default function AccessoriesManager({
  onLogMaintenance,
  openFormSignal,
}: AccessoriesManagerProps) {
  const { toast } = useToast();
  const { data: accessories, isLoading } = useAllAccessories();
  const deleteMutation = useDeleteAccessory();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Accessory | null>(null);
  const [lastSignal, setLastSignal] = useState(openFormSignal);

  // Parent asked for the create form. Derived during render rather than in an
  // effect so the dialog opens in the same commit as the click.
  if (openFormSignal !== undefined && openFormSignal !== lastSignal) {
    setLastSignal(openFormSignal);
    setEditingAccessory(null);
    setFormOpen(true);
  }

  const handleEdit = (accessory: Accessory) => {
    setEditingAccessory(accessory);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Accessory deleted" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      // delete_accessory_safe raises when the row is still referenced by a
      // mission; that is a routing problem for the user, not a failure.
      if (message.includes("referenced by")) {
        toast({
          title: "Cannot delete accessory",
          description:
            "This accessory is assigned to one or more missions. Remove it from mission equipment before deleting.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Delete failed", description: message, variant: "destructive" });
      }
    }
    setDeleteTarget(null);
  };

  if (isLoading) {
    return <LoadingState variant="table" rows={5} label="Loading accessories" />;
  }

  const rows = accessories ?? [];

  if (rows.length === 0) {
    return (
      <>
        <EmptyState
          icon={Package}
          title="No accessories yet"
          description="Filters, lenses, landing pads and anything else that travels with the aircraft."
        />
        <AccessoryFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          accessory={editingAccessory}
        />
      </>
    );
  }

  return (
    <div>
      {/* Table — md and up */}
      <div className="hidden overflow-hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Compatible Aircraft</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((accessory) => (
              <TableRow key={accessory.id}>
                <TableCell className="font-medium">{accessory.name}</TableCell>
                <TableCell className="capitalize">{accessory.type}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {accessory.serial_number || "N/A"}
                </TableCell>
                <TableCell className="text-sm">
                  {accessory.compatible_aircraft && accessory.compatible_aircraft.length > 0
                    ? accessory.compatible_aircraft.join(", ")
                    : "Universal"}
                </TableCell>
                <TableCell>
                  <Badge className={statusBadge(accessory.status)}>{accessory.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {onLogMaintenance && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onLogMaintenance(accessory)}
                        aria-label={`Log maintenance for ${accessory.name}`}
                      >
                        <Wrench className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(accessory)}
                      aria-label={`Edit ${accessory.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(accessory)}
                      aria-label={`Delete ${accessory.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards — below md, where six columns cannot fit */}
      <div className="space-y-3 md:hidden">
        {rows.map((accessory) => (
          <Card key={accessory.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{accessory.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{accessory.type}</p>
                </div>
                <Badge className={statusBadge(accessory.status)}>{accessory.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {accessory.serial_number && <span>S/N: {accessory.serial_number}</span>}
                <span>
                  {accessory.compatible_aircraft && accessory.compatible_aircraft.length > 0
                    ? accessory.compatible_aircraft.join(", ")
                    : "Universal"}
                </span>
              </div>
              <div className="flex gap-1">
                {onLogMaintenance && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => onLogMaintenance(accessory)}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Maintenance
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleEdit(accessory)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive"
                  onClick={() => setDeleteTarget(accessory)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AccessoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        accessory={editingAccessory}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Accessory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot
              be undone. If this accessory is assigned to any missions, the deletion will be
              blocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { AccessoriesManager };
