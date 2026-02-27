import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  X,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
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

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuotePayload {
  id: string;
  status: string;
  line_items: LineItem[];
  total: number;
  deposit_amount: number;
  notes: string | null;
  expires_at: string | null;
  customer_name: string | null;
  job_type: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function fnHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

type PageState = "loading" | "not_found" | "error" | "ready";

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "accepted") return "default";
  if (status === "declined") return "destructive";
  return "secondary";
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").toUpperCase();
}

const ACTIONABLE_STATUSES = ["sent", "revised"];

export default function QuoteAcceptancePage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    if (!token) {
      setPageState("not_found");
      return;
    }
    fetchQuote();
  }, [token]);

  const fetchQuote = async () => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/get-quote-by-token?token=${encodeURIComponent(token!)}`,
        { headers: fnHeaders() }
      );

      if (res.status === 404) {
        setPageState("not_found");
        return;
      }

      if (!res.ok) {
        setPageState("error");
        return;
      }

      const json = await res.json();
      setQuote(json.quote);
      setPageState("ready");
    } catch (err) {
      console.error("Error fetching quote:", err);
      setPageState("error");
    }
  };

  const callRespondToQuote = async (action: "accept" | "decline", reason?: string) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/respond-to-quote`, {
      method: "POST",
      headers: fnHeaders(),
      body: JSON.stringify({ token, action, decline_reason: reason ?? null }),
    });
    return res;
  };

  const handleAccept = async () => {
    if (!quote) return;
    setActionLoading(true);
    try {
      const res = await callRespondToQuote("accept");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({
          title: "Could not accept quote",
          description: body.error ?? "Please try again or contact us.",
          variant: "destructive",
        });
        return;
      }
      setQuote({ ...quote, status: "accepted" });
      toast({ title: "Quote Accepted", description: "Thank you! We will reach out shortly to confirm your booking." });
    } catch {
      toast({ title: "Network error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!quote) return;
    setActionLoading(true);
    try {
      const res = await callRespondToQuote("decline", declineReason.trim() || undefined);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({ title: "Could not decline quote", description: body.error ?? "Please try again.", variant: "destructive" });
        return;
      }
      setQuote({ ...quote, status: "declined" });
      toast({ title: "Quote Declined", description: "Thank you for letting us know." });
    } catch {
      toast({ title: "Network error", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setShowDeclineDialog(false);
    }
  };

  const isActionable = quote && ACTIONABLE_STATUSES.includes(quote.status);
  const isExpired = quote?.expires_at ? new Date(quote.expires_at) < new Date() : false;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  // ---- Loading ----
  if (pageState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ---- Not found ----
  if (pageState === "not_found") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Quote Not Found</h2>
            <p className="text-muted-foreground">
              This link may be invalid or the quote may no longer be available.
              Contact us at inquiries@sentinelaerialinspections.com for help.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Error ----
  if (pageState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              We could not load your quote. Please try refreshing or contact us.
            </p>
            <Button variant="outline" onClick={fetchQuote}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  const lineItems: LineItem[] = quote.line_items ?? [];
  const greeting = quote.customer_name ? `Hi ${quote.customer_name.split(" ")[0]},` : "Hello,";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-[#2b0a3d] text-white py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-[#dfae62]">
            Sentinel Aerial Inspections
          </h1>
          <p className="text-white/80 text-sm mt-1">Veteran-Owned Aerial Services</p>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Status banners */}
        {quote.status === "accepted" && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="h-5 w-5 flex-shrink-0" />
            <span>You accepted this quote. We will contact you to confirm scheduling.</span>
          </div>
        )}
        {quote.status === "declined" && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <X className="h-5 w-5 flex-shrink-0" />
            <span>You declined this quote. Contact us if you change your mind.</span>
          </div>
        )}
        {(quote.status === "expired" || isExpired) && quote.status !== "accepted" && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 flex-shrink-0" />
            <span>
              This quote expired{quote.expires_at ? ` on ${formatDate(quote.expires_at)}` : ""}. Contact us to request a new one.
            </span>
          </div>
        )}

        {/* Quote card */}
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {quote.job_type ?? "Aerial Inspection Services"}
                </p>
                <p className="text-muted-foreground">{greeting}</p>
                <p className="mt-1 text-foreground">
                  Please review your quote below and respond by{" "}
                  {quote.expires_at ? formatDate(quote.expires_at) : "the expiry date"}.
                </p>
              </div>
              <Badge variant={statusBadgeVariant(quote.status)} className="w-fit">
                {statusLabel(quote.status)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-8">
            {/* Line items */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Quote Details</h3>
              {lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">No line items specified.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Description</th>
                        <th className="text-center px-4 py-3 font-medium">Qty</th>
                        <th className="text-right px-4 py-3 font-medium">Unit Price</th>
                        <th className="text-right px-4 py-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-3">{item.description}</td>
                          <td className="text-center px-4 py-3">{item.quantity}</td>
                          <td className="text-right px-4 py-3">{formatCurrency(item.unit_price)}</td>
                          <td className="text-right px-4 py-3">{formatCurrency(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30">
                      <tr className="border-t">
                        <td colSpan={3} className="text-right px-4 py-3 font-bold text-base">Total</td>
                        <td className="text-right px-4 py-3 font-bold text-base text-primary">
                          {formatCurrency(quote.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>

            {/* Deposit callout */}
            <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-semibold text-sm text-amber-900 mb-1">Deposit to Schedule</p>
              <p className="text-sm text-amber-800">
                A deposit of {formatCurrency(quote.deposit_amount)} is due on acceptance to hold your date.
                The remaining balance is due Net 15 after delivery.
              </p>
            </section>

            {/* Notes */}
            {quote.notes && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{quote.notes}</p>
              </section>
            )}

            {/* Expiry */}
            {quote.expires_at && (
              <section className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Quote valid until {formatDate(quote.expires_at)}</span>
              </section>
            )}
          </CardContent>
        </Card>

        {/* Action buttons — only when actionable */}
        {isActionable && !isExpired && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Ready to move forward?</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={handleAccept}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Accept Quote
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => setShowDeclineDialog(true)}
                  disabled={actionLoading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#2b0a3d] text-white py-6 mt-12">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <p className="text-[#dfae62] font-semibold">Sentinel Aerial Inspections</p>
          <p className="text-sm text-white/60 mt-1">inquiries@sentinelaerialinspections.com</p>
          <p className="text-xs text-white/40 mt-2">
            &copy; {new Date().getFullYear()} Faith &amp; Harmony LLC DBA Sentinel Aerial Inspections. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Decline dialog */}
      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Let us know why this quote does not work for you (optional). We may be able to revise it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for declining (optional)"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline Quote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
