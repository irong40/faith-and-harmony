import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, RefreshCw, Plus, Edit, Trash2 } from "lucide-react";
import AdminNav from "./components/AdminNav";
import ProductForm, { type ProductFormData, type ProductSize } from "./components/ProductForm";
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

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "merchandise", label: "Merchandise" },
  { value: "aerial-art", label: "Aerial Art" },
];

export default function Products() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      product.name.toLowerCase().includes(searchLower) ||
      product.color.toLowerCase().includes(searchLower);

    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleCreate = async (data: ProductFormData) => {
    setIsSubmitting(true);
    const { error } = await supabase.from("products").insert({
      name: data.name,
      color: data.color,
      price: data.price,
      original_price: data.original_price,
      image: data.image,
      description: data.description,
      features: data.features,
      category: data.category,
      coming_soon: data.coming_soon,
      sizes: data.sizes as unknown as Json,
      active: data.active,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error creating product",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Product created successfully" });
      setIsFormOpen(false);
      fetchProducts();
    }
  };

  const handleUpdate = async (data: ProductFormData) => {
    if (!editingProduct) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: data.name,
        color: data.color,
        price: data.price,
        original_price: data.original_price,
        image: data.image,
        description: data.description,
        features: data.features,
        category: data.category,
        coming_soon: data.coming_soon,
        sizes: data.sizes as unknown as Json,
        active: data.active,
      })
      .eq("id", editingProduct.id);

    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error updating product",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Product updated successfully" });
      setEditingProduct(null);
      fetchProducts();
    }
  };

  const handleDelete = async () => {
    if (!deleteProduct) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", deleteProduct.id);

    if (error) {
      toast({
        title: "Error deleting product",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Product deleted successfully" });
      fetchProducts();
    }
    setDeleteProduct(null);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
  };

  const getFormDataFromProduct = (product: Product): ProductFormData => ({
    name: product.name,
    color: product.color,
    price: product.price,
    original_price: product.original_price,
    image: product.image,
    description: product.description,
    features: product.features,
    category: product.category,
    coming_soon: product.coming_soon,
    sizes: product.sizes as unknown as ProductSize[] | null,
    active: product.active,
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products</h1>
            <p className="text-sm text-muted-foreground">
              Manage your product catalog
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchProducts} variant="outline" disabled={loading}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {products.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Products</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {products.filter((p) => p.active).length}
            </div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {products.filter((p) => p.category === "merchandise").length}
            </div>
            <div className="text-sm text-muted-foreground">Merchandise</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {products.filter((p) => p.category === "aerial-art").length}
            </div>
            <div className="text-sm text-muted-foreground">Aerial Art</div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {product.color}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${product.price.toFixed(2)}</div>
                      {product.original_price && (
                        <div className="text-sm text-muted-foreground line-through">
                          ${product.original_price.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {product.active ? (
                          <Badge className="bg-green-500 text-white">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {product.coming_soon && (
                          <Badge className="bg-amber-500 text-white">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <ProductForm
            onSubmit={handleCreate}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              initialData={getFormDataFromProduct(editingProduct)}
              onSubmit={handleUpdate}
              onCancel={() => setEditingProduct(null)}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteProduct?.name}"? This action
              cannot be undone.
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
