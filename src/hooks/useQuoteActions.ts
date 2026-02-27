import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QuoteRequest {
  id: string;
  name: string;
  email: string;
  job_type: string | null;
  description: string;
}

interface Quote {
  id: string;
  status: string;
  sent_at: string | null;
  request_id: string;
}

interface UseQuoteActionsOptions {
  request: QuoteRequest;
  quote: Quote;
  onSuccess?: () => void;
}

export function useQuoteActions({ request, quote, onSuccess }: UseQuoteActionsOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quote-requests"] });
    queryClient.invalidateQueries({ queryKey: ["quotes"] });
  };

  // Send (draft or revised -> sent)
  const sendQuoteMutation = useMutation({
    mutationFn: async () => {
      if (quote.status !== "draft" && quote.status !== "revised") {
        throw new Error(`Cannot send a quote with status '${quote.status}'.`);
      }

      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Update quote status to sent with timestamps
      const { error: updateErr } = await supabase
        .from("quotes")
        .update({
          status: "sent",
          sent_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq("id", quote.id);

      if (updateErr) throw new Error(`Failed to update quote status: ${updateErr.message}`);

      // NOTIF-02: formal quote email on every admin send or resend
      // NOTIF-01 (auto-confirmation) is handled by submit-quote.ts in sentinel-landing, not here
      const { error: quoteEmailErr } = await supabase.functions.invoke("send-quote-email", {
        body: { quote_id: quote.id },
      });
      if (quoteEmailErr) {
        throw new Error(`Quote email failed: ${quoteEmailErr.message}`);
      }

      // Update quote_requests status to 'quoted' now that the formal quote has been sent
      await supabase
        .from("quote_requests")
        .update({ status: "quoted" })
        .eq("id", request.id);
    },
    onSuccess: () => {
      toast({ title: "Quote sent", description: `Formal quote emailed to ${request.email}.` });
      invalidate();
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    },
  });

  // Revise (declined -> revised)
  const reviseQuoteMutation = useMutation({
    mutationFn: async () => {
      if (quote.status !== "declined") {
        throw new Error(`Cannot revise a quote with status '${quote.status}'.`);
      }

      const { error } = await supabase
        .from("quotes")
        .update({ status: "revised" })
        .eq("id", quote.id);

      if (error) throw new Error(`Failed to revise quote: ${error.message}`);
    },
    onSuccess: () => {
      toast({ title: "Quote marked for revision", description: "Edit the quote and resend when ready." });
      invalidate();
      onSuccess?.();
    },
    onError: (err: Error) => {
      toast({ title: "Revision failed", description: err.message, variant: "destructive" });
    },
  });

  return {
    sendQuote: sendQuoteMutation.mutate,
    isSending: sendQuoteMutation.isPending,
    reviseQuote: reviseQuoteMutation.mutate,
    isRevising: reviseQuoteMutation.isPending,
  };
}
