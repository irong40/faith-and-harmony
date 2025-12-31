import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "./components/AdminNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
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
  Search, RefreshCw, Plus, Eye, Edit, Trash2,
  Users, DollarSign, Calendar, Star, Building2, MapPin
} from "lucide-react";
import { format } from "date-fns";
import CustomerForm, { type CustomerFormData } from "./components/CustomerForm";
import EngagementFormModal from "./components/EngagementFormModal";

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

interface ClientSummary {
  id: string;
  company_name: string;
  city: string | null;
  portfolio_type: string | null;
  total_engagements: number;
  engagements_this_month: number;
  total_revenue: number | null;
  avg_satisfaction: number | null;
  last_engagement: string | null;
  next_scheduled: string | null;
}

export default function People() {
  const { toast } = useToast();

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Client state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showEngagementForm, setShowEngagementForm] = useState(false);

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading customers", description: error.message, variant: "destructive" });
    } else {
      setCustomers(data || []);
    }
    setCustomersLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['drone-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('drone_client_summary').select('*');
      if (error) throw error;
      return data as ClientSummary[];
    },
  });

  const { data: engagementStats } = useQuery({
    queryKey: ['engagement-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_engagements')
        .select('actual_revenue, engagement_date, satisfaction_score')
        .gte('engagement_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]);
      if (error) throw error;
      const totalRevenue = data.reduce((sum, e) => sum + (e.actual_revenue || 0), 0);
      const avgSatisfaction = data.filter(e => e.satisfaction_score).length > 0
        ? data.reduce((sum, e) => sum + (e.satisfaction_score || 0), 0) / data.filter(e => e.satisfaction_score).length
        : 0;
      return { count: data.length, revenue: totalRevenue, satisfaction: avgSatisfaction };
    },
  });

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
      name: data.name, email: data.email, phone: data.phone || null,
      company_name: data.company_name || null, address: data.address || null,
      city: data.city || null, state: data.state || null, zip: data.zip || null,
      notes: data.notes || null,
    });
    if (error) {
      toast({ title: "Error creating customer", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Customer created successfully" });
      setIsFormOpen(false);
      fetchCustomers();
    }
  };

  const handleUpdate = async (data: CustomerFormData) => {
    if (!editingCustomer) return;
    const { error } = await supabase.from("customers").update({
      name: data.name, email: data.email, phone: data.phone || null,
      company_name: data.company_name || null, address: data.address || null,
      city: data.city || null, state: data.state || null, zip: data.zip || null,
      notes: data.notes || null,
    }).eq("id", editingCustomer.id);
    if (error) {
      toast({ title: "Error updating customer", description: error.message, variant: "destructive" });
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
      toast({ title: "Error deleting customer", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Customer deleted successfully" });
      fetchCustomers();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">People</h1>
          <p className="text-muted-foreground">Manage customers and drone clients</p>
        </div>

        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="clients">Drone Clients</TabsTrigger>
          </TabsList>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name, email, or company..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchCustomers} variant="outline" disabled={customersLoading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${customersLoading ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button onClick={() => setIsFormOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Customer</Button>
              </div>
            </div>

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
                  {customersLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                  ) : filteredCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No customers found</TableCell></TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell className="hidden md:table-cell">{customer.phone || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{customer.company_name || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell whitespace-nowrap">{customer.created_at ? format(new Date(customer.created_at), "MMM d, yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedCustomer(customer); setIsDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditingCustomer(customer)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(customer.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Drone Clients Tab */}
          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{clients.length}</p><p className="text-sm text-muted-foreground">Active Clients</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-green-500/10"><Calendar className="h-5 w-5 text-green-500" /></div><div><p className="text-2xl font-bold">{engagementStats?.count || 0}</p><p className="text-sm text-muted-foreground">This Month</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><DollarSign className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">${(engagementStats?.revenue || 0).toLocaleString()}</p><p className="text-sm text-muted-foreground">Revenue (Month)</p></div></div></CardContent></Card>
              <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Star className="h-5 w-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{engagementStats?.satisfaction ? engagementStats.satisfaction.toFixed(1) : '-'}</p><p className="text-sm text-muted-foreground">Avg Satisfaction</p></div></div></CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>All Clients</CardTitle></CardHeader>
              <CardContent>
                {clientsLoading ? (
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : clients.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground"><Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>No clients yet.</p><p className="text-sm">Convert leads to clients to see them here.</p></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-center">Engagements</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-center">Satisfaction</TableHead>
                        <TableHead>Last Engagement</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.company_name}</TableCell>
                          <TableCell>{client.city && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3 w-3" />{client.city}</div>}</TableCell>
                          <TableCell>{client.portfolio_type && <Badge variant="outline">{client.portfolio_type}</Badge>}</TableCell>
                          <TableCell className="text-center"><div className="flex items-center justify-center gap-1"><span className="font-medium">{client.total_engagements}</span>{client.engagements_this_month > 0 && <Badge variant="secondary" className="text-xs">+{client.engagements_this_month}</Badge>}</div></TableCell>
                          <TableCell className="text-right font-medium">${(client.total_revenue || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-center">{client.avg_satisfaction ? <div className="flex items-center justify-center gap-1"><Star className="h-3 w-3 text-amber-500" />{client.avg_satisfaction.toFixed(1)}</div> : '-'}</TableCell>
                          <TableCell>{client.last_engagement ? <span className="text-sm text-muted-foreground">{format(new Date(client.last_engagement), 'MMM d, yyyy')}</span> : '-'}</TableCell>
                          <TableCell><Button variant="outline" size="sm" onClick={() => { setSelectedClientId(client.id); setShowEngagementForm(true); }}><Plus className="h-3 w-3 mr-1" />Add</Button></TableCell>
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

      {/* Customer Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Customer Details</DialogTitle></DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-muted-foreground">Name</Label><p className="font-medium">{selectedCustomer.name}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p className="font-medium">{selectedCustomer.email}</p></div>
                <div><Label className="text-muted-foreground">Phone</Label><p className="font-medium">{selectedCustomer.phone || "—"}</p></div>
                <div><Label className="text-muted-foreground">Company</Label><p className="font-medium">{selectedCustomer.company_name || "—"}</p></div>
              </div>
              {(selectedCustomer.address || selectedCustomer.city) && (
                <div><Label className="text-muted-foreground">Address</Label><p className="font-medium">{selectedCustomer.address}{selectedCustomer.city && <>, {selectedCustomer.city}</>}{selectedCustomer.state && <>, {selectedCustomer.state}</>}{selectedCustomer.zip && <> {selectedCustomer.zip}</>}</p></div>
              )}
              {selectedCustomer.notes && (
                <div><Label className="text-muted-foreground">Notes</Label><p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{selectedCustomer.notes}</p></div>
              )}
              <div className="text-sm text-muted-foreground">Created: {selectedCustomer.created_at ? format(new Date(selectedCustomer.created_at), "MMMM d, yyyy 'at' h:mm a") : "N/A"}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CustomerForm open={isFormOpen} onOpenChange={setIsFormOpen} onSubmit={handleCreate} />
      <CustomerForm open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)} onSubmit={handleUpdate} defaultValues={editingCustomer || undefined} isEditing />
      {showEngagementForm && selectedClientId && <EngagementFormModal leadId={selectedClientId} open={showEngagementForm} onClose={() => { setShowEngagementForm(false); setSelectedClientId(null); }} />}
    </div>
  );
}
