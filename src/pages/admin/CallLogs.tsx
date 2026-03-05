import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
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
import { format } from "date-fns";
import { Phone, RefreshCw, FileText } from "lucide-react";

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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function CallLogs() {
  const [outcomeFilter, setOutcomeFilter] = useState("All");
  const [selectedLog, setSelectedLog] = useState<CallLogRow | null>(null);
  const queryClient = useQueryClient();

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

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["call-logs"] });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Phone className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Call Logs</h1>
              <p className="text-sm text-muted-foreground">
                Voice bot calls from the 757 line
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Outcome filter bar */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {OUTCOME_FILTERS.map((filter) => (
            <Button
              key={filter}
              variant={outcomeFilter === filter ? "default" : "outline"}
              size="sm"
              onClick={() => setOutcomeFilter(filter)}
            >
              {filter === "All" ? "All" : filter}
            </Button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading call logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No calls found.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
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
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(
                        new Date(log.started_at ?? log.created_at),
                        "MMM d, h:mm a"
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {log.leads?.caller_name ??
                        log.caller_number ??
                        "Unknown"}
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
                        <Badge className="bg-green-500 text-white">
                          Linked
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
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
      </div>

      <CallTranscriptDialog
        callLog={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
