import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// -------------------------------------------------------
// Types
// -------------------------------------------------------
type LeadDetail = {
  lead: {
    id: string;
    caller_name: string;
    caller_phone: string;
    caller_email: string | null;
    source_channel: string;
    qualification_status: string;
    created_at: string;
  };
  callLog: {
    id: string;
    transcript: string | null;
    summary: string | null;
    recording_url: string | null;
    duration_seconds: number | null;
    outcome: string | null;
    started_at: string | null;
  } | null;
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SOURCE_CHANNEL_LABELS: Record<string, string> = {
  voice_bot: "Voice Bot",
  web_form: "Web Form",
  manual: "Manual",
  email_outreach: "Email",
  social: "Social",
};

// -------------------------------------------------------
// Component
// -------------------------------------------------------
type LeadDetailDrawerProps = {
  leadId: string | null;
  onClose: () => void;
};

export function LeadDetailDrawer({ leadId, onClose }: LeadDetailDrawerProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: async (): Promise<LeadDetail> => {
      const { data: lead, error: leadError } = await supabase
        .from("leads" as never)
        .select("id, caller_name, caller_phone, caller_email, source_channel, qualification_status, created_at")
        .eq("id", leadId as string)
        .single() as { data: LeadDetail["lead"] | null; error: unknown };

      if (leadError || !lead) throw leadError ?? new Error("Lead not found");

      const { data: callLog, error: callLogError } = await supabase
        .from("vapi_call_logs" as never)
        .select("id, transcript, summary, recording_url, duration_seconds, outcome, started_at")
        .eq("lead_id", leadId as string)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: LeadDetail["callLog"]; error: unknown };

      if (callLogError) throw callLogError;

      return { lead, callLog: callLog ?? null };
    },
    enabled: !!leadId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">

        {/* Section 1: Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : error ? (
            <SheetTitle className="text-destructive">Failed to load lead</SheetTitle>
          ) : data ? (
            <>
              <SheetTitle>{data.lead.caller_name}</SheetTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{data.lead.caller_phone}</span>
                <Badge variant="secondary">
                  {SOURCE_CHANNEL_LABELS[data.lead.source_channel] ?? data.lead.source_channel}
                </Badge>
              </div>
            </>
          ) : null}
        </SheetHeader>

        {/* Section 2: Call info */}
        {!isLoading && !error && data?.callLog && (
          <div className="px-6 py-4 border-b space-y-3">
            {data.callLog.summary && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {data.callLog.summary}
              </div>
            )}
            {data.callLog.recording_url && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Recording</p>
                <audio
                  controls
                  className="w-full h-10"
                  src={data.callLog.recording_url}
                />
              </div>
            )}
            {data.callLog.duration_seconds != null && (
              <p className="text-xs text-muted-foreground">
                Duration: {formatDuration(data.callLog.duration_seconds)}
              </p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="px-6 py-4 border-b space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {/* PLAN-03: notes form will go here */}

        {/* Section 3: Transcript */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
              Unable to load call details. Please try again.
            </div>
          ) : !data?.callLog ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
              No call log found for this lead
            </div>
          ) : !data.callLog.transcript ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-6">
              No transcript available
            </div>
          ) : (
            <ScrollArea className="h-full">
              <pre className="whitespace-pre-wrap font-mono text-sm p-6">
                {data.callLog.transcript}
              </pre>
              {/* PLAN-03: activity timeline will go here */}
            </ScrollArea>
          )}
        </div>

      </SheetContent>
    </Sheet>
  );
}
