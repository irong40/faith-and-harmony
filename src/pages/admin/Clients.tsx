import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Users, RefreshCw, Building2, Mail, Phone } from "lucide-react";
import AdminNav from "./components/AdminNav";
import ClientFormDialog from "@/components/admin/ClientFormDialog";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
}

export default function Clients() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clients", page, search],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("id, name, company, email, phone, city, state, is_active, created_at", {
          count: "exact",
        })
        .order("name")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { clients: (data || []) as Client[], total: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const clients = data?.clients || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleAddClient = () => {
    setEditingClient(null);
    setIsDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    refetch();
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Clients</h1>
              <p className="text-sm text-muted-foreground">
                {total} {total === 1 ? "client" : "clients"} total
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleAddClient}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? "No clients match your search." : "No clients yet. Add one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEditClient(client)}
                  >
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      {client.company ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {client.company}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.email ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {client.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.phone ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {client.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[client.city, client.state].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.is_active ? "default" : "secondary"}
                        className={client.is_active ? "bg-green-500 text-white" : ""}
                      >
                        {client.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : clients.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {search ? "No clients match your search." : "No clients yet."}
            </p>
          ) : (
            clients.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleEditClient(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{client.name}</p>
                      {client.company && (
                        <p className="text-sm text-muted-foreground truncate">{client.company}</p>
                      )}
                      <div className="mt-2 space-y-1">
                        {client.email && (
                          <p className="text-sm text-muted-foreground truncate">{client.email}</p>
                        )}
                        {client.phone && (
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        )}
                        {(client.city || client.state) && (
                          <p className="text-sm text-muted-foreground">
                            {[client.city, client.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={client.is_active ? "default" : "secondary"}
                      className={`shrink-0 ${client.is_active ? "bg-green-500 text-white" : ""}`}
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </main>

      <ClientFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        client={editingClient}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
