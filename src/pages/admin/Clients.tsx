import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Plus,
  Users,
  RefreshCw,
  Building2,
  Mail,
  MessageSquare,
  Phone,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import ClientFormDialog from "@/components/admin/ClientFormDialog";
import PageShell from "@/components/admin/PageShell";
import { MessagesPanel } from "./Messages";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

/** Shape of the `drone_client_summary` view (ported from the retired People page). */
interface ClientSummary {
  id: string | null;
  company_name: string | null;
  total_engagements: number | null;
  engagements_this_month: number | null;
  total_revenue: number | null;
  avg_satisfaction: number | null;
  last_engagement: string | null;
}

// ---------------------------------------------------------------------------
// Engagement roll-up join key.
//
// `drone_client_summary` is keyed on drone_leads.id, NOT clients.id — they are
// separate id spaces and `clients` carries no FK to drone_leads, so a PostgREST
// embed is impossible here (it would 400 for want of a constraint to resolve).
// Company name is the only column the view exposes that both sides share.
//
// This matches how the rows were actually written: the old People page's
// conversion path set `customers.name = lead.company_name` in one direction and
// `drone_leads.company_name = customer.company_name || customer.name` in the
// other, so a converted record agrees on this key. Anything that does not match
// simply renders "—" — an unmatched client is never shown a zero, because a
// zero would read as "no engagements" rather than "no roll-up row".
// ---------------------------------------------------------------------------
const summaryKey = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

/** Tab ids are part of the URL contract — /admin/messages redirects to ?tab=messages. */
export const CLIENT_TABS = ["clients", "messages"] as const;
export type ClientTab = (typeof CLIENT_TABS)[number];

export function resolveClientTab(raw: string | null): ClientTab {
  return raw === "messages" ? "messages" : "clients";
}

export default function Clients() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // The tab lives in the URL because notifications.link points straight at
  // /admin/messages?conversation=<uuid>, which lands here as ?tab=messages.
  const tab = resolveClientTab(searchParams.get("tab"));

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "clients") {
      params.delete("tab");
      // Leaving a stale ?conversation= behind would re-open the thread the
      // moment the user switched back to Messages.
      params.delete("conversation");
    } else {
      params.set("tab", next);
    }
    setSearchParams(params, { replace: true });
  };

  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["clients", page, search],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        // address/zip/notes are selected even though no column renders them:
        // ClientFormDialog prefills from this row, and an absent field there
        // becomes "" and then saves back as null. Dropping them from this
        // select silently wipes a client's address on any edit. Deleting the
        // People page removed the only other editor, so this is now the sole
        // write path for those fields.
        .select(
          "id, name, company, email, phone, address, city, state, zip, notes, is_active, created_at",
          { count: "exact" }
        )
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

  // Engagement roll-up, ported from the retired People page. Kept as its own
  // query so a slow aggregate view never blocks the client list from painting.
  const { data: summaries } = useQuery({
    queryKey: ["drone-client-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_client_summary")
        .select(
          "id, company_name, total_engagements, engagements_this_month, total_revenue, avg_satisfaction, last_engagement"
        );
      if (error) throw error;
      return (data || []) as ClientSummary[];
    },
    // Aggregates move slowly; no reason to refetch them on every page change.
    staleTime: 5 * 60 * 1000,
  });

  const summaryByName = useMemo(() => {
    const map = new Map<string, ClientSummary>();
    for (const row of summaries ?? []) {
      const key = summaryKey(row.company_name);
      if (key) map.set(key, row);
    }
    return map;
  }, [summaries]);

  /** Try the company column first, then the name column — either may hold it. */
  const summaryFor = (client: Client): ClientSummary | undefined =>
    summaryByName.get(summaryKey(client.company)) ??
    summaryByName.get(summaryKey(client.name));

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
    <PageShell
      title="Clients"
      description={
        tab === "messages"
          ? "Customer conversations"
          : `${total} ${total === 1 ? "client" : "clients"} total`
      }
      icon={Users}
      width="wide"
      actions={
        tab === "clients" ? (
          <>
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={handleAddClient}>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </>
        ) : undefined
      }
    >
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <MessagesPanel />
        </TabsContent>

        <TabsContent value="clients">
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
              aria-label="Search clients"
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
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden xl:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                {/* Engagement roll-up — ported from the retired People page. */}
                <TableHead className="text-center">Engagements</TableHead>
                <TableHead className="text-right">Total Revenue</TableHead>
                <TableHead className="hidden xl:table-cell text-center">Satisfaction</TableHead>
                <TableHead className="hidden xl:table-cell">Last Engagement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {search ? "No clients match your search." : "No clients yet. Add one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => {
                  const summary = summaryFor(client);
                  return (
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
                    <TableCell className="hidden lg:table-cell">
                      {client.email ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {client.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {client.phone ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {client.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {[client.city, client.state].filter(Boolean).join(", ") || "—"}
                    </TableCell>

                    {/* --- engagement roll-up (drone_client_summary) --------- */}
                    <TableCell className="text-center">
                      {summary ? (
                        <span className="flex items-center justify-center gap-1">
                          <span className="font-medium">{summary.total_engagements ?? 0}</span>
                          {(summary.engagements_this_month ?? 0) > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{summary.engagements_this_month}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {summary ? (
                        `$${(summary.total_revenue ?? 0).toLocaleString()}`
                      ) : (
                        <span className="font-normal text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-center">
                      {summary?.avg_satisfaction ? (
                        <span className="flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" aria-hidden="true" />
                          {summary.avg_satisfaction.toFixed(1)}
                          <span className="sr-only">out of 5 average satisfaction</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                      {summary?.last_engagement
                        ? format(new Date(summary.last_engagement), "MMM d, yyyy")
                        : "—"}
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
                  );
                })
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
            clients.map((client) => {
              const summary = summaryFor(client);
              return (
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

                  {/* Engagement roll-up — only rendered when the client actually
                      has a drone_client_summary row, so the card stays compact
                      for the majority that do not. */}
                  {summary && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-sm">
                      <span className="text-muted-foreground">
                        Engagements{" "}
                        <span className="font-medium text-foreground">
                          {summary.total_engagements ?? 0}
                        </span>
                        {(summary.engagements_this_month ?? 0) > 0 && (
                          <Badge variant="secondary" className="ml-1 text-xs">
                            +{summary.engagements_this_month}
                          </Badge>
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        Revenue{" "}
                        <span className="font-medium text-foreground">
                          ${(summary.total_revenue ?? 0).toLocaleString()}
                        </span>
                      </span>
                      {summary.avg_satisfaction ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Star className="h-3 w-3 text-amber-500" aria-hidden="true" />
                          <span className="font-medium text-foreground">
                            {summary.avg_satisfaction.toFixed(1)}
                          </span>
                          <span className="sr-only">out of 5 average satisfaction</span>
                        </span>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })
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
        </TabsContent>
      </Tabs>

      <ClientFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        client={editingClient}
        onSuccess={handleSuccess}
      />
    </PageShell>
  );
}
