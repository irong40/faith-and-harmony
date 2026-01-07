import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search,
  Send,
  CheckCircle,
  Copy,
  Eye,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import AdminNav from "./components/AdminNav";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

interface LineItem {
  description: string;
  quantity?: number;
  unit_price?: number;
  amount: number;
}

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

interface Invoice {
  id: string;
  invoice_number: string;
  proposal_id: string | null;
  customer_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount: number | null;
  total: number;
  amount_paid: number | null;
  balance_due: number | null;
  payment_terms: string | null;
  line_items: Json | null;
  notes: string | null;
  admin_notes: string | null;
  view_token: string;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  customer_payment_claim: Record<string, unknown> | null;
  created_at: string;
  customers?: {
    name: string;
    email: string;
    company_name: string | null;
  } | null;
  proposals?: {
    proposal_number: string;
    title: string;
  } | null;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Draft", variant: "secondary", icon: FileText },
  sent: { label: "Sent", variant: "default", icon: Send },
  paid: { label: "Paid", variant: "outline", icon: CheckCircle },
  overdue: { label: "Overdue", variant: "destructive", icon: AlertTriangle },
  cancelled: { label: "Cancelled", variant: "secondary", icon: FileText },
};

export default function Invoices() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<Invoice | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customers (name, email, company_name),
          proposals (proposal_number, title)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Invoice[];
    },
  });

  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const { error } = await supabase.functions.invoke("send-service-invoice-email", {
        body: { invoiceId: invoice.id },
      });
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", invoice.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice sent successfully");
    },
    onError: (error) => {
      toast.error("Failed to send invoice: " + error.message);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoice: Invoice) => {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          amount_paid: invoice.total,
        })
        .eq("id", invoice.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setMarkPaidDialogOpen(false);
      setInvoiceToMarkPaid(null);
      toast.success("Invoice marked as paid");
    },
    onError: (error) => {
      toast.error("Failed to mark invoice as paid: " + error.message);
    },
  });

  const copyInvoiceLink = (invoice: Invoice) => {
    const link = `${window.location.origin}/invoice/${invoice.view_token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invoice link copied to clipboard");
  };

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      invoice.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
      invoice.customers?.email?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = invoices?.reduce(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      acc.total += 1;
      if (inv.status !== "paid" && inv.status !== "cancelled") {
        acc.outstanding += inv.balance_due || 0;
      }
      return acc;
    },
    { draft: 0, sent: 0, paid: 0, overdue: 0, cancelled: 0, total: 0, outstanding: 0 } as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage customer invoices and payments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                ${statusCounts?.outstanding?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter("draft")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{statusCounts?.draft || 0}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter("sent")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{statusCounts?.sent || 0}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50" onClick={() => setStatusFilter("overdue")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{statusCounts?.overdue || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Invoices Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : filteredInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices?.map((invoice) => {
                  const StatusIcon = statusConfig[invoice.status].icon;
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customers?.name || "Unknown"}</div>
                          <div className="text-sm text-muted-foreground">
                            {invoice.customers?.company_name || invoice.customers?.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">${invoice.total.toLocaleString()}</div>
                          {invoice.balance_due !== null && invoice.balance_due > 0 && invoice.balance_due !== invoice.total && (
                            <div className="text-sm text-muted-foreground">
                              Due: ${invoice.balance_due.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[invoice.status].variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[invoice.status].label}
                        </Badge>
                        {invoice.customer_payment_claim && (
                          <Badge variant="outline" className="ml-2 gap-1">
                            <DollarSign className="h-3 w-3" />
                            Payment Claimed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(invoice.due_date), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedInvoice(invoice)}
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyInvoiceLink(invoice)}
                            title="Copy Link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {invoice.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => sendInvoiceMutation.mutate(invoice)}
                              disabled={sendInvoiceMutation.isPending}
                              title="Send Invoice"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {(invoice.status === "sent" || invoice.status === "overdue") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setInvoiceToMarkPaid(invoice);
                                setMarkPaidDialogOpen(true);
                              }}
                              title="Mark as Paid"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Customer</div>
                  <div className="font-medium">{selectedInvoice.customers?.name}</div>
                  <div className="text-sm">{selectedInvoice.customers?.email}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <Badge variant={statusConfig[selectedInvoice.status].variant}>
                    {statusConfig[selectedInvoice.status].label}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Issue Date</div>
                  <div>{format(new Date(selectedInvoice.issue_date), "MMM d, yyyy")}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Due Date</div>
                  <div>{format(new Date(selectedInvoice.due_date), "MMM d, yyyy")}</div>
                </div>
              </div>

              {selectedInvoice.proposals && (
                <div>
                  <div className="text-sm text-muted-foreground">Related Proposal</div>
                  <div className="font-medium">
                    {selectedInvoice.proposals.proposal_number} - {selectedInvoice.proposals.title}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground mb-2">Line Items</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedInvoice.line_items as unknown as LineItem[])?.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">${item.amount?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${selectedInvoice.subtotal.toLocaleString()}</span>
                </div>
                {selectedInvoice.discount && selectedInvoice.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${selectedInvoice.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${selectedInvoice.total.toLocaleString()}</span>
                </div>
                {selectedInvoice.amount_paid && selectedInvoice.amount_paid > 0 && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Amount Paid</span>
                      <span>${selectedInvoice.amount_paid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Balance Due</span>
                      <span>${selectedInvoice.balance_due?.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>

              {selectedInvoice.payment_terms && (
                <div>
                  <div className="text-sm text-muted-foreground">Payment Terms</div>
                  <div>{selectedInvoice.payment_terms}</div>
                </div>
              )}

              {selectedInvoice.notes && (
                <div>
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div>{selectedInvoice.notes}</div>
                </div>
              )}

              {selectedInvoice.customer_payment_claim && (
                <div className="bg-accent/50 p-4 rounded-lg">
                  <div className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Customer Payment Claim
                  </div>
                  <pre className="text-sm">
                    {JSON.stringify(selectedInvoice.customer_payment_claim, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => copyInvoiceLink(selectedInvoice)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                {selectedInvoice.status === "draft" && (
                  <Button onClick={() => sendInvoiceMutation.mutate(selectedInvoice)}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invoice
                  </Button>
                )}
                {(selectedInvoice.status === "sent" || selectedInvoice.status === "overdue") && (
                  <Button
                    onClick={() => {
                      setInvoiceToMarkPaid(selectedInvoice);
                      setMarkPaidDialogOpen(true);
                      setSelectedInvoice(null);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Confirmation */}
      <AlertDialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Invoice as Paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark invoice {invoiceToMarkPaid?.invoice_number} as fully paid for $
              {invoiceToMarkPaid?.total.toLocaleString()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invoiceToMarkPaid && markPaidMutation.mutate(invoiceToMarkPaid)}
            >
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
