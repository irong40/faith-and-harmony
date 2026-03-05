import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Badge } from "@/components/ui/badge";
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
import { format } from "date-fns";
import { Target, RefreshCw, Search } from "lucide-react";
import { OUTCOME_COLORS } from "./CallLogs";

type LeadRow = {
  id: string;
  created_at: string;
  caller_name: string;
  caller_phone: string;
  caller_email: string | null;
  source_channel: string;
  qualification_status: string;
  call_id: string | null;
  client_id: string | null;
  quote_request_id: string | null;
  quote_requests: {
    id: string;
    status: string;
  } | null;
};

const STATUS_FILTERS = ["All", "qualified", "declined", "transferred", "pending"];
const PAGE_SIZE = 20;

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-leads", statusFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("leads" as never)
        .select(
          "id, created_at, caller_name, caller_phone, caller_email, source_channel, qualification_status, call_id, client_id, quote_request_id, quote_requests ( id, status )",
          { count: "exact" }
        )
        .eq("source_channel", "voice_bot")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "All") {
        query = query.eq("qualification_status", statusFilter);
      }

      if (search.trim()) {
        query = query.or(
          `caller_name.ilike.%${search}%,caller_phone.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return {
        leads: (data ?? []) as unknown as LeadRow[],
        total: count ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Leads</h1>
              <p className="text-sm text-muted-foreground">
                Voice bot sourced leads and conversion tracking
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Status filter bar */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter(filter);
                setPage(0);
              }}
            >
              {filter === "All" ? "All" : filter}
            </Button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No leads found.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Converted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(lead.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lead.caller_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.caller_phone}
                    </TableCell>
                    <TableCell className="text-sm">
                      {lead.caller_email ?? "No email"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          OUTCOME_COLORS[lead.qualification_status] ??
                          "bg-gray-400 text-white"
                        }
                      >
                        {lead.qualification_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.quote_requests ? (
                        <Badge className="bg-green-500 text-white">
                          Quoted ({lead.quote_requests.status})
                        </Badge>
                      ) : lead.quote_request_id ? (
                        <Badge variant="secondary">Linked</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No quote
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

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
      </div>
    </div>
  );
}
