import { useEffect, useState } from "react";
import { CheckCircle, FileDown, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canApproveEngineReport, signEngineReportUrl } from "@/lib/engineReport";
import type { EngineReportDocument, ReportStatus } from "@/types/report";

export interface EngineReportViewProps {
  document: EngineReportDocument;
  status: ReportStatus;
  approving: boolean;
  onApprove: () => void;
}

/**
 * The CRM's whole job for a client report: show the PDF the engine drew,
 * let Adam approve it, and let him download it. Delivery links the approved
 * PDF automatically. Nothing here re-lays-out or re-renders the report.
 */
export function EngineReportView({ document: doc, status, approving, onApprove }: EngineReportViewProps) {
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [signFailed, setSignFailed] = useState(false);
  const approval = canApproveEngineReport(doc);
  const meta = doc.metadata ?? {};

  useEffect(() => {
    let live = true;
    // Never show the previous document while the new one is being signed.
    setViewUrl(null);
    setSignFailed(false);
    signEngineReportUrl(doc.file_path).then((url) => {
      if (!live) return;
      setViewUrl(url);
      setSignFailed(url === null);
    });
    return () => {
      live = false;
    };
  }, [doc.file_path]);

  const handleDownload = async () => {
    const url = await signEngineReportUrl(doc.file_path, { download: doc.file_name });
    if (url) window.open(url, "_blank", "noopener");
    else setSignFailed(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          className={status === "final" ? "bg-green-600 text-white border-green-600" : "border-yellow-500 text-yellow-700"}
        >
          {status === "final" ? "Approved" : status}
        </Badge>
        <span className="text-sm text-muted-foreground" data-testid="engine-report-file">
          {doc.file_name}
          {meta.report_id ? ` · ${meta.report_id}` : ""}
          {meta.engine_version ? ` · engine ${meta.engine_version}` : ""}
        </span>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <FileDown className="h-4 w-4 mr-1" /> Download PDF
        </Button>
        <Button
          size="sm"
          onClick={onApprove}
          // Approval means "I reviewed this PDF": impossible while it has not
          // opened, or could not be.
          disabled={!approval.ok || approving || status === "final" || !viewUrl || signFailed}
          title={approval.reason ?? (!viewUrl || signFailed ? "Open the PDF before approving it." : undefined)}
        >
          {approving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
          {status === "final" ? "Approved" : "Approve for delivery"}
        </Button>
      </div>

      {!approval.ok && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not ready to send</AlertTitle>
          <AlertDescription>{approval.reason}</AlertDescription>
        </Alert>
      )}

      {signFailed ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not open the PDF</AlertTitle>
          <AlertDescription>
            The file is listed but storage would not sign a link for {doc.file_path}.
          </AlertDescription>
        </Alert>
      ) : viewUrl ? (
        <iframe
          title="Engine report PDF"
          src={viewUrl}
          className="min-h-[70vh] w-full flex-1 rounded border bg-white"
        />
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Opening the PDF
        </div>
      )}
    </div>
  );
}

export default EngineReportView;
