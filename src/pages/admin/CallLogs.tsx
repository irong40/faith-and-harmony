import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import CallTranscriptDialog from "@/components/admin/CallTranscriptDialog";
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
import { LoadingState, EmptyState } from "@/components/admin/PageState";
import { format } from "date-fns";
import { Phone, FileText } from "lucide-react";

// ---------------------------------------------------------------------------
// Call logs — absorbed into Leads as its third tab rather than deleted.
//
// LeadDetailDrawer already reads vapi_call_logs for a lead that exists, but a
// large share of calls never become a lead at all (voicemail, abandoned,
// declined). Dropping this view would make those calls invisible, so the table
// survives as a panel and only its page chrome went away.
// ---------------------------------------------------------------------------

type CallLogRow = {
  id: string;
  call_id: string;
  caller_number: string | null;
  duration_seconds: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  outcome: string | null;
  transcript: string | null;
  summary: string | null;
  recording_url: string | null;
  lead_id: string | null;
  leads: {
    caller_name: string;
    caller_phone: string;
    quote_request_id: string | null;
  } | null;
};

export const OUTCOME_COLORS: Record<string, string> = {
  qualified: "bg-green-500 text-white",
  declined: "bg-red-500 text-white",
  transferred: "bg-blue-500 text-white",
  voicemail: "bg-slate-500 text-white",
  abandoned: "bg-gray-400 text-white",
  pending: "bg-amber-500 text-white",
};

const OUTCOME_FILTERS = [
  "All",
  "qualified",
  "declined",
  "transferred",
  "voicemail",
  "abandoned",
];

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/** The call log table on its own — page frame supplied by whoever mounts it. */
export function CallLogsPanel() {
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [selectedLog, setSelectedLog] = useState<CallLogRow | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["call-logs", outcomeFilter],
    queryFn: async () => {
      let query = supabase
        .from("vapi_call_logs" as never)
        .select(
          "id, call_id, caller_number, duration_seconds, started_at, ended_at, created_at, outcome, transcript, summary, recording_url, lead_id, leads ( caller_name, caller_phone, quote_request_id )"
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (outcomeFilter !== "All") {
        query = query.eq("outcome", outcomeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as CallLogRow[];
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="space-y-4">
      {/* Outcome filter bar */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter calls by outcome"
      >
        {OUTCOME_FILTERS.map((filter) => (
          <Button
            key={filter}
            variant={outcomeFilter === filter ? "default" : "outline"}
            size="sm"
            onClick={() => setOutcomeFilter(filter)}
            aria-pressed={outcomeFilter === filter}
            className="capitalize"
          >
            {filter}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <LoadingState variant="table" rows={6} label="Loading call logs" />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No calls found"
          description={
            outcomeFilter === "All"
              ? "Calls to the 757 line will appear here once the voice bot logs them."
              : `No calls with the "${outcomeFilter}" outcome.`
          }
        />
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Caller</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Transcript</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {format(
                      new Date(log.started_at ?? log.created_at),
                      "MMM d, h:mm a"
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.leads?.caller_name ?? log.caller_number ?? "Unknown"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.leads?.caller_phone ?? log.caller_number ?? "N/A"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDuration(log.duration_seconds)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        OUTCOME_COLORS[log.outcome ?? ""] ??
                        "bg-gray-400 text-white"
                      }
                    >
                      {log.outcome ?? "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.leads?.quote_request_id ? (
                      <Badge className="bg-green-500 text-white">Linked</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.transcript ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setSelectedLog(log)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No transcript
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CallTranscriptDialog
        callLog={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}

export default CallLogsPanel;
