import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Camera, Clock, DollarSign, Package } from "lucide-react";
import { toast } from "sonner";
import { DronePackageForm } from "./components/DronePackageForm";

export default function DronePackages() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: packages, isLoading } = useQuery({
    queryKey: ["drone-packages-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_packages")
        .select("*")
        .order("category", { ascending: true })
        .order("price", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("drone_packages")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drone-packages-admin"] });
      toast.success("Package updated");
    },
  });

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const getShotCount = (manifest: any[] | null) => {
    if (!manifest || !Array.isArray(manifest)) return 0;
    return manifest.length;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "real_estate": return "bg-blue-500/10 text-blue-600";
      case "construction": return "bg-orange-500/10 text-orange-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Drone Packages</h1>
            <p className="text-muted-foreground">Manage pricing, shot manifests, and edit budgets</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Package</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Package</DialogTitle>
              </DialogHeader>
              <DronePackageForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{packages?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Packages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {packages?.filter(p => p.active).length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Camera className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {packages?.filter(p => p.category === "real_estate").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Real Estate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {packages?.filter(p => p.category === "construction").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Construction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Packages Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Packages</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Edit Budget</TableHead>
                    <TableHead>Shots</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages?.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pkg.name}</p>
                          <p className="text-sm text-muted-foreground">{pkg.code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryColor(pkg.category)}>
                          {pkg.category === "real_estate" ? "Real Estate" : "Construction"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(pkg.price))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {pkg.edit_budget_minutes} min
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Camera className="h-4 w-4 text-muted-foreground" />
                          {getShotCount(pkg.shot_manifest as any[])}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pkg.active ? "default" : "secondary"}>
                          {pkg.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate({ 
                              id: pkg.id, 
                              active: !pkg.active 
                            })}
                          >
                            {pkg.active ? "Deactivate" : "Activate"}
                          </Button>
                          <Dialog open={editingPackage?.id === pkg.id} onOpenChange={(open) => !open && setEditingPackage(null)}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setEditingPackage(pkg)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Package</DialogTitle>
                              </DialogHeader>
                              <DronePackageForm 
                                package={editingPackage} 
                                onSuccess={() => setEditingPackage(null)} 
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
