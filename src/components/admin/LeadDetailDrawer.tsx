import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

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

type ActivityEvent = {
  lead_id: string;
  event_type: string;
  event_at: string;
  summary: string;
  source_id: string | null;
};

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------
const EVENT_TYPE_COLORS: Record<string, string> = {
  status_change: "bg-blue-100 text-blue-800",
  note_added: "bg-green-100 text-green-800",
  converted: "bg-purple-100 text-purple-800",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  status_change: "Status",
  note_added: "Note",
  converted: "Converted",
};

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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [noteContent, setNoteContent] = useState("");
  const [reasonTag, setReasonTag] = useState("");
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { error } = await (supabase as never)
        .from("lead_notes")
        .insert({
          lead_id: leadId,
          content: noteContent.trim(),
          reason_tag: reasonTag || null,
          follow_up_at: followUpDate ? followUpDate.toISOString() : null,
          created_by: session.user.id,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteContent("");
      setReasonTag("");
      setFollowUpDate(undefined);
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-activity", leadId] });
      toast({ title: "Note saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: timeline = [], isLoading: timelineLoading } = useQuery({
    queryKey: ["lead-activity", leadId],
    queryFn: async () => {
      const { data, error } = await (supabase as never)
        .from("lead_activity")
        .select("lead_id, event_type, event_at, summary, source_id")
        .eq("lead_id", leadId)
        .order("event_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ActivityEvent[];
    },
    enabled: !!leadId,
    staleTime: 30_000,
  });

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

        {/* Section 3: Notes form */}
        {!isLoading && !error && (
          <div className="px-6 py-4 border-b space-y-3">
            <p className="text-sm font-medium">Add Note</p>
            <Textarea
              placeholder="Write a note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex gap-2 flex-wrap">
              <Select value={reasonTag} onValueChange={setReasonTag}>
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="Reason tag (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_ready">Not Ready</SelectItem>
                  <SelectItem value="wrong_area">Wrong Area</SelectItem>
                  <SelectItem value="needs_callback">Needs Callback</SelectItem>
                  <SelectItem value="price_sensitive">Price Sensitive</SelectItem>
                </SelectContent>
              </Select>

              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm font-normal">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {followUpDate ? format(followUpDate, "MMM d, yyyy") : "Follow-up date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={followUpDate}
                    onSelect={(date) => { setFollowUpDate(date); setDatePickerOpen(false); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {followUpDate && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setFollowUpDate(undefined)}>
                  Clear date
                </Button>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => saveNoteMutation.mutate()}
              disabled={!noteContent.trim() || saveNoteMutation.isPending}
            >
              {saveNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        )}

        {/* Section 4: Transcript + Activity Timeline */}
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
          ) : (
            <ScrollArea className="h-full">
              {!data?.callLog ? (
                <div className="px-6 py-4 text-sm text-muted-foreground">
                  No call log found for this lead
                </div>
              ) : !data.callLog.transcript ? (
                <div className="px-6 py-4 text-sm text-muted-foreground">
                  No transcript available
                </div>
              ) : (
                <div className="px-6 py-4">
                  <p className="text-sm font-medium mb-2">Transcript</p>
                  <pre className="whitespace-pre-wrap font-mono text-sm">
                    {data.callLog.transcript}
                  </pre>
                </div>
              )}

              <Separator />

              <div className="px-6 py-4">
                <p className="text-sm font-medium mb-3">Activity</p>
                {timelineLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : timeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <div className="space-y-2">
                    {timeline.map((event, idx) => (
                      <div key={`${event.event_at}-${idx}`} className="flex items-start gap-3 text-sm">
                        <Badge className={`shrink-0 text-xs ${EVENT_TYPE_COLORS[event.event_type] ?? "bg-gray-100 text-gray-700"}`}>
                          {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-snug">{event.summary}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(event.event_at), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

      </SheetContent>
    </Sheet>
  );
}
