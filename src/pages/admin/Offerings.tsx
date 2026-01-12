import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "./components/AdminNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Search, RefreshCw, Plus, Edit, Trash2, Camera, Clock, DollarSign, Package } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import ProductForm, { type ProductFormData, type ProductSize } from "./components/ProductForm";
import { DronePackageForm } from "./components/DronePackageForm";
import type { Json } from "@/integrations/supabase/types";

interface Product {
  id: string;
  name: string;
  color: string;
  price: number;
  original_price: number | null;
  image: string;
  description: string;
  features: string[];
  category: string;
  coming_soon: boolean;
  sizes: Json | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface DronePackage {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number | string;
  edit_budget_minutes: number;
  active: boolean;
  shot_manifest?: ShotManifestItem[] | null;
}

interface ShotManifestItem {
  shot_type: string;
  altitude_range: string;
  weight: number;
  required: boolean;
  description: string;
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "merchandise", label: "Merchandise" },
  { value: "aerial-art", label: "Aerial Art" },
];

export default function Offerings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Packages state
  const [isPackageCreateOpen, setIsPackageCreateOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<DronePackage | null>(null);

  const fetchProducts = async () => {
    setProductsLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading products", description: error.message, variant: "destructive" });
    } else {
      setProducts(data || []);
    }
    setProductsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const { data: packages, isLoading: packagesLoading } = useQuery({
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
      const { error } = await supabase.from("drone_packages").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drone-packages-admin"] });
      sonnerToast.success("Package updated");
    },
  });

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === "" || product.name.toLowerCase().includes(searchLower) || product.color.toLowerCase().includes(searchLower);
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleCreateProduct = async (data: ProductFormData) => {
    setIsSubmitting(true);
    const { error } = await supabase.from("products").insert({
      name: data.name, color: data.color, price: data.price, original_price: data.original_price,
      image: data.image, description: data.description, features: data.features, category: data.category,
      coming_soon: data.coming_soon, sizes: data.sizes as unknown as Json, active: data.active,
    });
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Error creating product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product created successfully" });
      setIsProductFormOpen(false);
      fetchProducts();
    }
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (!editingProduct) return;
    setIsSubmitting(true);
    const { error } = await supabase.from("products").update({
      name: data.name, color: data.color, price: data.price, original_price: data.original_price,
      image: data.image, description: data.description, features: data.features, category: data.category,
      coming_soon: data.coming_soon, sizes: data.sizes as unknown as Json, active: data.active,
    }).eq("id", editingProduct.id);
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Error updating product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product updated successfully" });
      setEditingProduct(null);
      fetchProducts();
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProduct) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteProduct.id);
    if (error) {
      toast({ title: "Error deleting product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product deleted successfully" });
      fetchProducts();
    }
    setDeleteProduct(null);
  };

  const getFormDataFromProduct = (product: Product): ProductFormData => ({
    name: product.name, color: product.color, price: product.price, original_price: product.original_price,
    image: product.image, description: product.description, features: product.features, category: product.category,
    coming_soon: product.coming_soon, sizes: product.sizes as unknown as ProductSize[] | null, active: product.active,
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  const getShotCount = (manifest: ShotManifestItem[] | null | undefined) => (!manifest || !Array.isArray(manifest)) ? 0 : manifest.length;
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Offerings</h1>
          <p className="text-muted-foreground">Manage products and drone packages</p>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="packages">Drone Packages</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search by name or color..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by category" /></SelectTrigger>
                  <SelectContent>{CATEGORY_OPTIONS.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchProducts} variant="outline" disabled={productsLoading}><RefreshCw className={`mr-2 h-4 w-4 ${productsLoading ? "animate-spin" : ""}`} /> Refresh</Button>
                <Button onClick={() => setIsProductFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4 text-center"><div className="text-2xl font-bold text-foreground">{products.length}</div><div className="text-sm text-muted-foreground">Total Products</div></div>
              <div className="rounded-lg border border-border bg-card p-4 text-center"><div className="text-2xl font-bold text-foreground">{products.filter((p) => p.active).length}</div><div className="text-sm text-muted-foreground">Active</div></div>
              <div className="rounded-lg border border-border bg-card p-4 text-center"><div className="text-2xl font-bold text-foreground">{products.filter((p) => p.category === "merchandise").length}</div><div className="text-sm text-muted-foreground">Merchandise</div></div>
              <div className="rounded-lg border border-border bg-card p-4 text-center"><div className="text-2xl font-bold text-foreground">{products.filter((p) => p.category === "aerial-art").length}</div><div className="text-sm text-muted-foreground">Aerial Art</div></div>
            </div>

            <div className="rounded-lg border border-border bg-card">
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead>Price</TableHead><TableHead className="hidden sm:table-cell">Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {productsLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                  ) : filteredProducts.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
                  ) : (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell><div className="flex items-center gap-3"><div className="h-10 w-10 rounded bg-secondary overflow-hidden flex-shrink-0"><img src={product.image} alt={product.name} className="h-full w-full object-cover" /></div><div><div className="font-medium">{product.name}</div><div className="text-sm text-muted-foreground">{product.color}</div></div></div></TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant="outline">{product.category}</Badge></TableCell>
                        <TableCell><div className="font-medium">${product.price.toFixed(2)}</div>{product.original_price && <div className="text-sm text-muted-foreground line-through">${product.original_price.toFixed(2)}</div>}</TableCell>
                        <TableCell className="hidden sm:table-cell"><div className="flex flex-wrap gap-1">{product.active ? <Badge className="bg-green-500 text-white">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}{product.coming_soon && <Badge className="bg-amber-500 text-white">Coming Soon</Badge>}</div></TableCell>
                        <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => setEditingProduct(product)}><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteProduct(product)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Drone Packages Tab */}
          <TabsContent value="packages" className="space-y-6">
            <div className="flex items-center justify-end">
              <Dialog open={isPackageCreateOpen} onOpenChange={setIsPackageCreateOpen}>
                <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New Package</Button></DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Create Package</DialogTitle></DialogHeader><DronePackageForm onSuccess={() => setIsPackageCreateOpen(false)} /></DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Package className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{packages?.length || 0}</p><p className="text-sm text-muted-foreground">Total Packages</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{packages?.filter(p => p.active).length || 0}</p><p className="text-sm text-muted-foreground">Active</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Camera className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{packages?.filter(p => p.category === "real_estate").length || 0}</p><p className="text-sm text-muted-foreground">Real Estate</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 bg-orange-500/10 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div><div><p className="text-2xl font-bold">{packages?.filter(p => p.category === "construction").length || 0}</p><p className="text-sm text-muted-foreground">Construction</p></div></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>All Packages</CardTitle></CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Package</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>Edit Budget</TableHead><TableHead>Shots</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {packages?.map((pkg) => (
                        <TableRow key={pkg.id}>
                          <TableCell><div><p className="font-medium">{pkg.name}</p><p className="text-sm text-muted-foreground">{pkg.code}</p></div></TableCell>
                          <TableCell><Badge variant="outline" className={getCategoryColor(pkg.category)}>{pkg.category === "real_estate" ? "Real Estate" : "Construction"}</Badge></TableCell>
                          <TableCell className="font-medium">{formatCurrency(Number(pkg.price))}</TableCell>
                          <TableCell><div className="flex items-center gap-1"><Clock className="h-4 w-4 text-muted-foreground" />{pkg.edit_budget_minutes} min</div></TableCell>
                          <TableCell><div className="flex items-center gap-1"><Camera className="h-4 w-4 text-muted-foreground" />{getShotCount(pkg.shot_manifest as any[])}</div></TableCell>
                          <TableCell><Badge variant={pkg.active ? "default" : "secondary"}>{pkg.active ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => toggleActiveMutation.mutate({ id: pkg.id, active: !pkg.active })}>{pkg.active ? "Deactivate" : "Activate"}</Button>
                              <Dialog open={editingPackage?.id === pkg.id} onOpenChange={(open) => !open && setEditingPackage(null)}>
                                <DialogTrigger asChild><Button variant="outline" size="sm" onClick={() => setEditingPackage(pkg)}><Edit className="h-4 w-4" /></Button></DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Package</DialogTitle></DialogHeader><DronePackageForm package={editingPackage} onSuccess={() => setEditingPackage(null)} /></DialogContent>
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
          </TabsContent>
        </Tabs>
      </main>

      {/* Product Create Dialog */}
      <Dialog open={isProductFormOpen} onOpenChange={setIsProductFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add New Product</DialogTitle></DialogHeader><ProductForm onSubmit={handleCreateProduct} onCancel={() => setIsProductFormOpen(false)} isSubmitting={isSubmitting} /></DialogContent>
      </Dialog>

      {/* Product Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>{editingProduct && <ProductForm initialData={getFormDataFromProduct(editingProduct)} onSubmit={handleUpdateProduct} onCancel={() => setEditingProduct(null)} isSubmitting={isSubmitting} />}</DialogContent>
      </Dialog>

      {/* Product Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Product?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{deleteProduct?.name}"? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
