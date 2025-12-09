import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Search, RefreshCw, Plus, Eye, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import AdminNav from "./components/AdminNav";
import CustomerForm, { type CustomerFormData } from "./components/CustomerForm";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function Customers() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading customers",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      searchTerm === "" ||
      customer.name.toLowerCase().includes(searchLower) ||
      customer.email.toLowerCase().includes(searchLower) ||
      customer.company_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleCreate = async (data: CustomerFormData) => {
    const { error } = await supabase.from("customers").insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      company_name: data.company_name || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      notes: data.notes || null,
    });

    if (error) {
      toast({
        title: "Error creating customer",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Customer created successfully" });
      setIsFormOpen(false);
      fetchCustomers();
    }
  };

  const handleUpdate = async (data: CustomerFormData) => {
    if (!editingCustomer) return;

    const { error } = await supabase
      .from("customers")
      .update({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        company_name: data.company_name || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        notes: data.notes || null,
      })
      .eq("id", editingCustomer.id);

    if (error) {
      toast({
        title: "Error updating customer",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Customer updated successfully" });
      setEditingCustomer(null);
      fetchCustomers();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting customer",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Customer deleted successfully" });
      fetchCustomers();
    }
  };

  const openDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
            <p className="text-sm text-muted-foreground">
              Manage your customer database
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchCustomers} variant="outline" disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {customer.phone || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {customer.company_name || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell whitespace-nowrap">
                      {customer.created_at
                        ? format(new Date(customer.created_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(customer)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}>
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

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Name</Label>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedCustomer.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedCustomer.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Company</Label>
                  <p className="font-medium">{selectedCustomer.company_name || "—"}</p>
                </div>
              </div>
              {(selectedCustomer.address || selectedCustomer.city) && (
                <div>
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">
                    {selectedCustomer.address}
                    {selectedCustomer.city && <>, {selectedCustomer.city}</>}
                    {selectedCustomer.state && <>, {selectedCustomer.state}</>}
                    {selectedCustomer.zip && <> {selectedCustomer.zip}</>}
                  </p>
                </div>
              )}
              {selectedCustomer.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                    {selectedCustomer.notes}
                  </p>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Created:{" "}
                {selectedCustomer.created_at
                  ? format(new Date(selectedCustomer.created_at), "MMMM d, yyyy 'at' h:mm a")
                  : "N/A"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Customer Form */}
      <CustomerForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
      />

      {/* Edit Customer Form */}
      <CustomerForm
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        onSubmit={handleUpdate}
        defaultValues={editingCustomer || undefined}
        isEditing
      />
    </div>
  );
}
