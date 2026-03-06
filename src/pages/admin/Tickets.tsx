import { useState } from "react";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TicketCheck, RefreshCw, ExternalLink } from "lucide-react";
import {
  useTickets,
  useUpdateTicketStatus,
  type MaintenanceTicket,
} from "@/hooks/useMissionControlAdmin";

const STATUS_OPTIONS = ["all", "open", "in-progress", "resolved", "closed"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  "in-progress": "bg-amber-100 text-amber-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const TYPE_COLORS: Record<string, string> = {
  bug: "bg-red-50 text-red-700",
  "feature-request": "bg-purple-50 text-purple-700",
  "break-fix": "bg-orange-50 text-orange-700",
  question: "bg-blue-50 text-blue-700",
};

export default function Tickets() {
  const { data: tickets, isLoading, refetch } = useTickets();
  const updateStatus = useUpdateTicketStatus();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [editStatus, setEditStatus] = useState<MaintenanceTicket["status"]>("open");
  const [editResolution, setEditResolution] = useState("");

  const filteredTickets = tickets?.filter(
    (t) => statusFilter === "all" || t.status === statusFilter
  );

  const openDetail = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditResolution(ticket.resolution || "");
  };

  const handleSave = async () => {
    if (!selectedTicket) return;

    try {
      await updateStatus.mutateAsync({
        id: selectedTicket.id,
        status: editStatus,
        resolution: editResolution || null,
        ticketNumber: selectedTicket.ticket_number,
      });
      toast.success("Ticket updated");
      setSelectedTicket(null);
    } catch (error) {
      toast.error("Failed to update ticket");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Tickets</h1>
            <p className="text-muted-foreground">Triage and manage maintenance tickets</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 mb-4">
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s === "all" ? "All" : s}
              {s !== "all" && tickets && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({tickets.filter((t) => t.status === s).length})
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Ticket Detail Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedTicket && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {selectedTicket.ticket_number}
                    </span>
                    {selectedTicket.title}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 pt-1">
                    <Badge className={TYPE_COLORS[selectedTicket.type]}>{selectedTicket.type}</Badge>
                    <Badge className={PRIORITY_COLORS[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                    <Badge className={STATUS_COLORS[selectedTicket.status]}>{selectedTicket.status}</Badge>
                    <Badge variant="outline">{selectedTicket.category}</Badge>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {selectedTicket.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Description</Label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                  )}

                  {selectedTicket.steps_to_reproduce && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Steps to Reproduce</Label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{selectedTicket.steps_to_reproduce}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">App</Label>
                      <p className="mt-0.5">{selectedTicket.apps?.name || "Unlinked"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Submitted Via</Label>
                      <p className="mt-0.5">{selectedTicket.submitted_via || "N/A"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Reporter</Label>
                      <p className="mt-0.5">
                        {selectedTicket.reporter_name || "Anonymous"}
                        {selectedTicket.reporter_email && (
                          <span className="text-muted-foreground ml-1">({selectedTicket.reporter_email})</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Created</Label>
                      <p className="mt-0.5">{formatDate(selectedTicket.created_at)}</p>
                    </div>
                  </div>

                  {selectedTicket.page_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Page URL</Label>
                      <a
                        href={selectedTicket.page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {selectedTicket.page_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {selectedTicket.browser_info && Object.keys(selectedTicket.browser_info).length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">Browser Info</Label>
                      <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(selectedTicket.browser_info, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedTicket.external_reference && (
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase">External Reference</Label>
                      <p className="mt-0.5 text-sm">{selectedTicket.external_reference}</p>
                    </div>
                  )}

                  <hr />

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-status">Status</Label>
                      <Select
                        value={editStatus}
                        onValueChange={(v) => setEditStatus(v as MaintenanceTicket["status"])}
                      >
                        <SelectTrigger id="ticket-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-resolution">Resolution Notes</Label>
                      <Textarea
                        id="ticket-resolution"
                        value={editResolution}
                        onChange={(e) => setEditResolution(e.target.value)}
                        placeholder="Describe the fix or resolution..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedTicket(null)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={updateStatus.isPending}>
                    {updateStatus.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketCheck className="h-5 w-5" />
              Maintenance Tickets
            </CardTitle>
            <CardDescription>
              {filteredTickets?.length || 0} ticket{filteredTickets?.length !== 1 ? "s" : ""}
              {statusFilter !== "all" && (` (${statusFilter})`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredTickets?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TicketCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tickets found</p>
                <p className="text-sm">
                  {statusFilter !== "all"
                    ? `No ${statusFilter} tickets — try a different filter`
                    : "Tickets submitted from satellite apps will appear here"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets?.map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(ticket)}
                    >
                      <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                      <TableCell>
                        {ticket.apps ? (
                          <span className="text-sm">{ticket.apps.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate font-medium">
                        {ticket.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={TYPE_COLORS[ticket.type]} variant="secondary">
                          {ticket.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={PRIORITY_COLORS[ticket.priority]}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[ticket.status]}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ticket.submitted_via || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
