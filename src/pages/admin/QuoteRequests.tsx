import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import QuoteBuilder from "./components/QuoteBuilder";
import { useQuoteActions } from "@/hooks/useQuoteActions";
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
import { RefreshCw, FileText, Inbox, Send, RotateCcw } from "lucide-react";

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

interface Quote {
  id: string;
  status: string;
  total: number;
  deposit_amount: number;
  sent_at: string | null;
  updated_at: string;
  request_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-slate-500 text-white",
  reviewed: "bg-blue-500 text-white",
  quoted: "bg-amber-500 text-white",
  closed: "bg-gray-400 text-white",
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-400 text-white",
  sent: "bg-blue-500 text-white",
  accepted: "bg-green-600 text-white",
  declined: "bg-red-500 text-white",
  revised: "bg-amber-500 text-white",
  expired: "bg-gray-400 text-white",
};

const STATUS_FILTERS = ["All", "New", "Reviewed", "Quoted", "Closed"];

// Sub-component that owns useQuoteActions per row to satisfy Rules of Hooks
function QuoteActionRow({
  request,
  quote,
  onOpenBuilder,
  onRefresh,
}: {
  request: QuoteRequest;
  quote: Quote | undefined;
  onOpenBuilder: () => void;
  onRefresh: () => void;
}) {
  const { sendQuote, isSending, reviseQuote, isRevising } = useQuoteActions({
    request,
    quote: quote ?? { id: "", status: "", sent_at: null, request_id: request.id },
    onSuccess: onRefresh,
  });

  const quoteStatus = quote?.status;

  return (
    <div className="flex flex-col gap-1.5">
      {/* Create / Edit Quote button (always visible unless accepted/expired) */}
      {(!quoteStatus || quoteStatus === "draft" || quoteStatus === "revised") && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={onOpenBuilder}
        >
          <FileText className="h-3.5 w-3.5" />
          {quoteStatus === "draft" || quoteStatus === "revised" ? "Edit Quote" : "Create Quote"}
        </Button>
      )}

      {/* Send button: shown when draft or revised */}
      {(quoteStatus === "draft" || quoteStatus === "revised") && (
        <Button
          size="sm"
          variant="default"
          className="gap-1.5"
          disabled={isSending}
          onClick={() => sendQuote()}
        >
          <Send className="h-3.5 w-3.5" />
          {isSending ? "Sending..." : "Send"}
        </Button>
      )}

      {/* Revise button: shown when declined */}
      {quoteStatus === "declined" && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={isRevising}
          onClick={() => reviseQuote()}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {isRevising ? "Revising..." : "Revise"}
        </Button>
      )}

      {/* Read-only badges for terminal or in-flight states */}
      {quoteStatus === "sent" && (
        <Badge className="bg-blue-500 text-white w-fit">
          Sent {quote?.sent_at ? format(new Date(quote.sent_at), "MMM d") : ""}
        </Badge>
      )}
      {quoteStatus === "accepted" && (
        <Badge className="bg-green-600 text-white w-fit">Accepted</Badge>
      )}
      {quoteStatus === "expired" && (
        <Badge className="bg-gray-400 text-white w-fit">Expired</Badge>
      )}
    </div>
  );
}

export default function QuoteRequests() {
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
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

  // Batch fetch all quotes for visible requests (avoids N+1)
  const { data: quotes = [] } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, status, total, deposit_amount, sent_at, updated_at, request_id")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quote[];
    },
  });

  // Map: request_id -> most recent quote (already ordered desc by created_at)
  const quoteByRequestId = quotes.reduce<Record<string, Quote>>((acc, q) => {
    if (!acc[q.request_id]) acc[q.request_id] = q;
    return acc;
  }, {});

  const filteredRequests =
    statusFilter === "All"
      ? requests
      : requests.filter(
          (r) => r.status.toLowerCase() === statusFilter.toLowerCase()
        );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
  };

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
            onClick={handleRefresh}
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
                  <TableHead>Quote</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const quote = quoteByRequestId[request.id];
                  return (
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
                        {quote ? (
                          <div className="flex flex-col gap-1">
                            <Badge
                              className={
                                QUOTE_STATUS_COLORS[quote.status] ?? "bg-gray-400 text-white"
                              }
                            >
                              {quote.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ${quote.total.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No quote yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <QuoteActionRow
                          request={request}
                          quote={quote}
                          onOpenBuilder={() => setSelectedRequest(request)}
                          onRefresh={handleRefresh}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              {selectedRequest
                ? (quoteByRequestId[selectedRequest.id]?.status === "draft" ||
                   quoteByRequestId[selectedRequest.id]?.status === "revised"
                    ? `Edit Quote for ${selectedRequest.name}`
                    : `Create Quote for ${selectedRequest.name}`)
                : ""}
            </DialogTitle>
          </DialogHeader>
          <QuoteBuilder
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onCreated={() => {
              handleRefresh();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
