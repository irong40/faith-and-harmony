import { useEffect, useState } from "react";
import { CheckCircle, FileDown, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  canApproveEngineReport,
  fetchVerifiedEngineReport,
  signEngineReportUrl,
} from "@/lib/engineReport";
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
 *
 * Approval waits for proof the PDF opened: the bytes are fetched, checked
 * against the engine's recorded SHA-256, and shown from memory. An iframe
 * load event is not proof, because browsers fire it for failed loads too.
 */
export function EngineReportView({ document: doc, status, approving, onApprove }: EngineReportViewProps) {
  // A blob: URL for bytes that passed verification, never a remote link.
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const approval = canApproveEngineReport(doc);
  const meta = doc.metadata ?? {};
  const expectedSha = meta.sha256;

  useEffect(() => {
    let live = true;
    let blobUrl: string | null = null;
    // Never show the previous document while the new one is being checked.
    setViewUrl(null);
    setOpenError(null);
    (async () => {
      const signed = await signEngineReportUrl(doc.file_path);
      if (!live) return;
      if (!signed) {
        setOpenError(`The file is listed but storage would not sign a link for ${doc.file_path}.`);
        return;
      }
      const result = await fetchVerifiedEngineReport(signed, expectedSha);
      if (!live) return;
      if (!result.ok || !result.bytes) {
        setOpenError(result.reason ?? "The PDF could not be verified.");
        return;
      }
      blobUrl = URL.createObjectURL(new Blob([result.bytes], { type: "application/pdf" }));
      setViewUrl(blobUrl);
    })();
    return () => {
      live = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [doc.file_path, expectedSha]);

  const handleDownload = async () => {
    const url = await signEngineReportUrl(doc.file_path, { download: doc.file_name });
    setDownloadFailed(!url);
    if (url) window.open(url, "_blank", "noopener");
  };

  const opened = Boolean(viewUrl) && !openError;

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
          // Approval means "I reviewed this PDF": impossible until the exact
          // released bytes have opened.
          disabled={!approval.ok || approving || status === "final" || !opened}
          title={approval.reason ?? (!opened ? "The PDF has to open before it can be approved." : undefined)}
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

      {downloadFailed && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Download failed</AlertTitle>
          <AlertDescription>Storage would not sign a download link for {doc.file_path}.</AlertDescription>
        </Alert>
      )}

      {openError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Could not open the PDF</AlertTitle>
          <AlertDescription>{openError}</AlertDescription>
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
