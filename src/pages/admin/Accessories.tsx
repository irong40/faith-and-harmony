import { useState } from "react";
import AdminNav from "./components/AdminNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Wrench, Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAllAccessories } from "@/hooks/useFleet";
import { useDeleteAccessory } from "@/hooks/useFleetMutations";
import { useQueryClient } from "@tanstack/react-query";
import AccessoryFormDialog from "@/components/admin/AccessoryFormDialog";
import type { Accessory } from "@/types/fleet";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500 text-white",
  maintenance: "bg-yellow-500 text-white",
  retired: "bg-gray-400 text-white",
  lost: "bg-red-500 text-white",
};

export default function Accessories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: accessories, isLoading } = useAllAccessories();
  const deleteMutation = useDeleteAccessory();

  const [formOpen, setFormOpen] = useState(false);
  const [editingAccessory, setEditingAccessory] = useState<Accessory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Accessory | null>(null);

  const handleEdit = (accessory: Accessory) => {
    setEditingAccessory(accessory);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingAccessory(null);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: "Accessory deleted" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("referenced by")) {
        toast({
          title: "Cannot delete accessory",
          description: "This accessory is assigned to one or more missions. Remove it from mission equipment before deleting.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Delete failed",
          description: message,
          variant: "destructive",
        });
      }
    }
    setDeleteTarget(null);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["fleet-accessories-all"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Wrench className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Accessories</h1>
              <p className="text-sm text-muted-foreground">
                Fleet accessories management
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Accessory
            </Button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading accessories...
          </div>
        ) : !accessories || accessories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No accessories found. Add your first accessory to get started.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Compatible Aircraft</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessories.map((accessory) => (
                  <TableRow key={accessory.id}>
                    <TableCell className="font-medium">
                      {accessory.name}
                    </TableCell>
                    <TableCell className="capitalize">
                      {accessory.type}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {accessory.serial_number || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {accessory.compatible_aircraft && accessory.compatible_aircraft.length > 0
                        ? accessory.compatible_aircraft.join(", ")
                        : "Universal"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          STATUS_COLORS[accessory.status] ?? "bg-gray-400 text-white"
                        }
                      >
                        {accessory.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(accessory)}
                          title="Edit accessory"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(accessory)}
                          title="Delete accessory"
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
        )}
      </div>

      {/* Form dialog for create/edit */}
      <AccessoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        accessory={editingAccessory}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Accessory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone. If this accessory is assigned to any missions, the deletion will be blocked.
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
