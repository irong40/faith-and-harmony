import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

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

const OUTCOME_COLORS: Record<string, string> = {
  qualified: "bg-green-500 text-white",
  declined: "bg-red-500 text-white",
  transferred: "bg-blue-500 text-white",
  voicemail: "bg-slate-500 text-white",
  abandoned: "bg-gray-400 text-white",
  pending: "bg-amber-500 text-white",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function CallTranscriptDialog({
  callLog,
  onClose,
}: {
  callLog: CallLogRow | null;
  onClose: () => void;
}) {
  if (!callLog) return null;

  const callerLabel =
    callLog.leads?.caller_name ?? callLog.caller_number ?? "Unknown";

  return (
    <Dialog open={!!callLog} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Call: {callerLabel}</DialogTitle>
        </DialogHeader>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {formatDuration(callLog.duration_seconds)}
          </span>
          <Badge
            className={
              OUTCOME_COLORS[callLog.outcome ?? ""] ?? "bg-gray-400 text-white"
            }
          >
            {callLog.outcome ?? "Unknown"}
          </Badge>
          {callLog.leads?.quote_request_id && (
            <Link
              to="/admin/quote-requests"
              className="text-primary underline text-sm"
            >
              View Quote Request
            </Link>
          )}
          {callLog.recording_url && (
            <Button variant="ghost" size="sm" className="gap-1.5" asChild>
              <a
                href={callLog.recording_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Recording
              </a>
            </Button>
          )}
        </div>

        {/* Summary */}
        {callLog.summary && (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {callLog.summary}
          </div>
        )}

        {/* Transcript */}
        <ScrollArea className="flex-1 min-h-0">
          <pre className="whitespace-pre-wrap font-mono text-sm p-2">
            {callLog.transcript ?? "No transcript available."}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
