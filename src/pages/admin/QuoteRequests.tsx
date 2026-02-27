import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import QuoteBuilder from "./components/QuoteBuilder";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { RefreshCw, FileText, Inbox } from "lucide-react";

interface QuoteRequest {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  job_type: string | null;
  description: string;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-500 text-white",
  reviewed: "bg-blue-500 text-white",
  quoted: "bg-amber-500 text-white",
  closed: "bg-gray-400 text-white",
};

const STATUS_FILTERS = ["All", "New", "Reviewed", "Quoted", "Closed"];

export default function QuoteRequests() {
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ["quote-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_requests")
        .select("id, name, email, phone, address, job_type, description, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as QuoteRequest[];
    },
  });

  const filteredRequests =
    statusFilter === "All"
      ? requests
      : requests.filter(
          (r) => r.status.toLowerCase() === statusFilter.toLowerCase()
        );

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Inbox className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Quote Requests</h1>
              <p className="text-sm text-muted-foreground">
                Incoming requests from sentinelaerialinspections.com
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Status filter bar */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading quote requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No quote requests found.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(request.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{request.name}</TableCell>
                    <TableCell className="text-sm">{request.email}</TableCell>
                    <TableCell className="text-sm">
                      {request.job_type ?? "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {request.description.length > 60
                        ? `${request.description.slice(0, 60)}...`
                        : request.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          STATUS_COLORS[request.status] ?? "bg-gray-400 text-white"
                        }
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        disabled={
                          request.status === "quoted" ||
                          request.status === "closed"
                        }
                        onClick={() => setSelectedRequest(request)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Create Quote
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* QuoteBuilder Dialog */}
      <Dialog
        open={selectedRequest !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRequest(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Create Quote for {selectedRequest?.name ?? ""}
            </DialogTitle>
          </DialogHeader>
          <QuoteBuilder
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onCreated={() => {
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
