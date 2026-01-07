import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Send,
  DollarSign,
  CreditCard,
  Loader2,
} from "lucide-react";
import fhWordmark from "@/assets/branding/fh-wordmark.png";

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
  view_token: string;
  viewed_at: string | null;
  paid_at: string | null;
  customers?: {
    name: string;
    email: string;
    company_name: string | null;
  } | null;
}

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  sent: { label: "Payment Due", color: "bg-amber-100 text-amber-800", icon: Clock },
  paid: { label: "Paid", color: "bg-green-100 text-green-800", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-destructive/10 text-destructive", icon: AlertTriangle },
  cancelled: { label: "Cancelled", color: "bg-muted text-muted-foreground", icon: FileText },
};

export default function CustomerInvoice() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [token]);

  const fetchInvoice = async () => {
    if (!token) return;

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customers (name, email, company_name)
        `)
        .eq("view_token", token)
        .single();

      if (error) throw error;

      setInvoice(data as Invoice);

      // Mark as viewed if not already
      if (!data.viewed_at) {
        await supabase
          .from("invoices")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    } catch (error) {
      console.error("Error fetching invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentClaim = async () => {
    if (!invoice || !paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    setSubmittingPayment(true);

    try {
      // Use secure edge function with token validation
      const { error } = await supabase.functions.invoke("invoice-payment-claim", {
        body: {
          view_token: token,
          payment_method: paymentMethod,
          amount: paymentAmount ? parseFloat(paymentAmount) : invoice.total,
          reference: paymentReference || null,
        },
      });

      if (error) throw error;

      toast.success("Payment notification sent! We'll confirm your payment shortly.");
      setPaymentDialogOpen(false);
      fetchInvoice();
    } catch (error) {
      console.error("Error submitting payment claim:", error);
      toast.error("Failed to submit payment notification");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              This invoice link may be invalid or expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusConfig[invoice.status].icon;
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";
  const showPaymentOptions = invoice.status === "sent" || invoice.status === "overdue";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6">
        <div className="container mx-auto px-4">
          <img src={fhWordmark} alt="Faith & Harmony" className="h-10 brightness-0 invert" />
        </div>
      </header>

      {/* Status Banner */}
      <div className={`py-4 ${statusConfig[invoice.status].color}`}>
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <StatusIcon className="h-5 w-5" />
          <span className="font-medium">
            {isPaid
              ? `Paid on ${format(new Date(invoice.paid_at!), "MMMM d, yyyy")}`
              : isOverdue
              ? `Payment was due on ${format(new Date(invoice.due_date), "MMMM d, yyyy")}`
              : `Payment due by ${format(new Date(invoice.due_date), "MMMM d, yyyy")}`}
          </span>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Invoice Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Invoice {invoice.invoice_number}</CardTitle>
                <p className="text-muted-foreground mt-1">
                  Issued on {format(new Date(invoice.issue_date), "MMMM d, yyyy")}
                </p>
              </div>
              <Badge className={statusConfig[invoice.status].color}>
                {statusConfig[invoice.status].label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground">Bill To</div>
                <div className="font-medium">{invoice.customers?.name}</div>
                {invoice.customers?.company_name && (
                  <div>{invoice.customers.company_name}</div>
                )}
                <div className="text-muted-foreground">{invoice.customers?.email}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">From</div>
                <div className="font-medium">Faith & Harmony, LLC</div>
                <div className="text-muted-foreground">Virginia Beach, VA</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.line_items as unknown as LineItem[])?.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">${item.amount?.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${invoice.subtotal.toLocaleString()}</span>
              </div>
              {invoice.discount && invoice.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${invoice.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xl pt-2 border-t">
                <span>{isPaid ? "Total Paid" : "Amount Due"}</span>
                <span>${invoice.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms */}
        {invoice.payment_terms && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Payment Terms</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{invoice.payment_terms}</p>
            </CardContent>
          </Card>
        )}

        {/* Payment Options */}
        {showPaymentOptions && (
          <Card className="mb-6 border-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <a
                  href="https://paypal.me/faithharmonyllc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full h-auto py-4">
                    <div className="text-center">
                      <div className="font-semibold">Pay via PayPal</div>
                      <div className="text-sm text-muted-foreground">paypal.me/faithharmonyllc</div>
                    </div>
                  </Button>
                </a>
                <a
                  href="https://cash.app/$FaithHarmonyLLC"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full h-auto py-4">
                    <div className="text-center">
                      <div className="font-semibold">Pay via Cash App</div>
                      <div className="text-sm text-muted-foreground">$FaithHarmonyLLC</div>
                    </div>
                  </Button>
                </a>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Please include <strong>{invoice.invoice_number}</strong> as the payment reference
              </p>
              <div className="pt-4 border-t">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setPaymentDialogOpen(true)}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  I've Made a Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paid Confirmation */}
        {isPaid && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800">Payment Received</h3>
              <p className="text-green-700">
                Thank you for your payment on {format(new Date(invoice.paid_at!), "MMMM d, yyyy")}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Contact Section */}
        <div className="text-center text-muted-foreground">
          <p>Questions about this invoice?</p>
          <p>
            Contact us at{" "}
            <a href="mailto:hello@faithharmony.com" className="text-primary hover:underline">
              hello@faithharmony.com
            </a>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Faith & Harmony, LLC. All rights reserved.</p>
        </div>
      </footer>

      {/* Payment Claim Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="cashapp">Cash App</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="payment-amount">Amount Paid</Label>
              <Input
                id="payment-amount"
                type="text"
                placeholder={`$${invoice.total.toLocaleString()}`}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="payment-reference">Transaction Reference (optional)</Label>
              <Input
                id="payment-reference"
                type="text"
                placeholder="Transaction ID or confirmation number"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePaymentClaim} disabled={submittingPayment}>
              {submittingPayment && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
