import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ExternalLink } from "lucide-react";
import { format } from "date-fns";

type PaymentStatus = "pending" | "paid" | "overdue" | "waived";
type PaymentType = "deposit" | "balance";

interface Payment {
  id: string;
  payment_type: PaymentType;
  status: PaymentStatus;
  amount: number;
  square_invoice_url: string | null;
  customer_email: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

interface PaymentsPanelProps {
  jobId: string;
}

const STATUS_BADGE: Record<PaymentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  paid: { label: "Paid", variant: "default", className: "bg-green-500 hover:bg-green-600" },
  pending: { label: "Pending", variant: "secondary", className: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  overdue: { label: "Overdue", variant: "destructive", className: "" },
  waived: { label: "Waived", variant: "outline", className: "" },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function PaymentsPanel({ jobId }: PaymentsPanelProps) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, payment_type, status, amount, square_invoice_url, customer_email, due_date, paid_at, created_at")
        .eq("job_id", jobId)
        .order("payment_type", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Payment[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading payments...</p>
        ) : !payments || payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments found</p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => {
              const badge = STATUS_BADGE[payment.status] ?? STATUS_BADGE.pending;
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {payment.payment_type === "deposit" ? "Deposit" : "Balance"}
                      </span>
                      <Badge variant={badge.variant} className={badge.className}>
                        {badge.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {payment.due_date && (
                        <span>Due {format(new Date(payment.due_date), "MMM d, yyyy")}</span>
                      )}
                      {payment.paid_at && (
                        <span>Paid {format(new Date(payment.paid_at), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">
                      {formatCurrency(payment.amount)}
                    </span>
                    {payment.square_invoice_url && (
                      <a
                        href={payment.square_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="View on Square"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
