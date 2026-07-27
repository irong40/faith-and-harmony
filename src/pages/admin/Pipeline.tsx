import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import PageShell from "@/components/admin/PageShell";
import { LoadingState, EmptyState } from "@/components/admin/PageState";
import { format } from "date-fns";
import { RefreshCw, FileText, Inbox, Send, RotateCcw, Phone, Globe, PenLine, Archive, ArchiveRestore, Check } from "lucide-react";

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
  source: "web" | "voice_bot" | "manual" | null;
  brand_slug: string | null;
  archived_at: string | null;
}

interface Quote {
  id: string;
  status: string;
  total: number;
  deposit_amount: number;
  sent_at: string | null;
  updated_at: string;
  request_id: string;
  line_items: { description: string; quantity: number; unit_price: number }[];
  notes: string | null;
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
  isArchived,
  onArchive,
}: {
  request: QuoteRequest;
  quote: Quote | undefined;
  onOpenBuilder: () => void;
  onRefresh: () => void;
  isArchived: boolean;
  onArchive: () => void;
}) {
  const { sendQuote, isSending, reviseQuote, isRevising, acceptQuote, isAccepting } = useQuoteActions({
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

      {/* Mark Accepted: the phone-close path.
          QuoteBuilder also carries this button, but the builder dialog is only
          reachable for draft/revised quotes — a SENT quote (the usual state
          when a client says yes on the phone) can only be accepted from here.
          Accepting fires trg_quote_accepted -> create_drone_job_from_quote. */}
      {(quoteStatus === "sent" || quoteStatus === "draft" || quoteStatus === "revised") && (
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={isAccepting}
          onClick={() => acceptQuote()}
          title="Client accepted — create the mission"
        >
          <Check className="h-3.5 w-3.5" />
          {isAccepting ? "Accepting..." : "Mark Accepted"}
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
      <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={onArchive}>
        {isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        {isArchived ? "Restore" : "Archive"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline — was QuoteRequests, at /admin/pipeline.
//
// The query keys are deliberately unchanged: `quote-requests` and `quotes` are
// invalidated from useQuoteActions and PricingEngine, so renaming them here
// would quietly stop those refreshes.
// ---------------------------------------------------------------------------
export default function Pipeline() {
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [descRequest, setDescRequest] = useState<QuoteRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["quote-requests", showArchived],
    queryFn: async () => {
      let query = supabase
        .from("quote_requests")
        .select("id, name, email, phone, address, job_type, description, status, created_at, source, brand_slug, archived_at")
        .order("created_at", { ascending: false });
      if (showArchived) {
        query = query.not("archived_at", "is", null);
      } else {
        query = query.is("archived_at", null);
      }
      const { data, error } = await query;
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
        .select("id, status, total, deposit_amount, sent_at, updated_at, request_id, line_items, notes")
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

  const archiveMutation = useMutation({
    mutationFn: async ({ id, restore }: { id: string; restore: boolean }) => {
      const { error } = await supabase.from("quote_requests").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quote-requests"] }); },
  });

  return (
    <PageShell
      title="Pipeline"
      description="Incoming quote requests from web, voice bot, and manual entry"
      icon={Inbox}
      width="full"
      actions={
        <>
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            aria-pressed={showArchived}
            className="gap-2"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Viewing Archived" : "Show Archived"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </>
      }
      toolbar={
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter)}
              aria-pressed={statusFilter === filter}
            >
              {filter}
            </Button>
          ))}
        </div>
      }
    >
        {/* Table */}
        {isLoading ? (
          <LoadingState variant="table" rows={6} label="Loading quote requests" />
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={showArchived ? "No archived requests" : "No quote requests yet"}
            description={
              showArchived
                ? "Requests you archive will be collected here."
                : "New requests from the web form, the voice bot and manual entry land here."
            }
          />
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quote</TableHead>
                  <TableHead className="sticky right-0 bg-background border-l">Actions</TableHead>
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
                      <TableCell>
                        {request.source === "voice_bot" ? (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Phone className="h-3 w-3" /> Bot
                          </Badge>
                        ) : request.source === "manual" ? (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <PenLine className="h-3 w-3" /> Manual
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Globe className="h-3 w-3" /> Web
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{request.name}</div>
                        {request.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[12rem]">
                            {request.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm max-w-[10rem]">
                        <span className="block truncate">{request.job_type ?? "N/A"}</span>
                      </TableCell>
                      <TableCell className="text-sm max-w-[12rem]">
                        {request.description ? (
                          <button
                            type="button"
                            onClick={() => setDescRequest(request)}
                            title="Click to read the full description"
                            className="block max-w-[12rem] truncate text-left text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                          >
                            {request.description}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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
                      <TableCell className="sticky right-0 bg-background border-l">
                        <QuoteActionRow
                          request={request}
                          quote={quote}
                          onOpenBuilder={() => setSelectedRequest(request)}
                          onRefresh={handleRefresh}
                          isArchived={showArchived}
                          onArchive={() => archiveMutation.mutate({ id: request.id, restore: showArchived })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

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
            existingQuote={selectedRequest ? quoteByRequestId[selectedRequest.id] ?? null : null}
            onClose={() => setSelectedRequest(null)}
            onCreated={() => {
              handleRefresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Full Description Dialog */}
      <Dialog
        open={descRequest !== null}
        onOpenChange={(open) => {
          if (!open) setDescRequest(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {descRequest ? `Request from ${descRequest.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {descRequest && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">Service:</span>{" "}
                  {descRequest.job_type ?? "N/A"}
                </span>
                <span>
                  <span className="font-medium text-foreground">Email:</span>{" "}
                  {descRequest.email}
                </span>
                {descRequest.phone && (
                  <span>
                    <span className="font-medium text-foreground">Phone:</span>{" "}
                    {descRequest.phone}
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3">
                {descRequest.description || "(no description provided)"}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
