import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, XCircle, Clock, Eye } from "lucide-react";
import QADetailModal from "./QADetailModal";
import type { Database, Json } from "@/integrations/supabase/types";

type QAStatus = Database["public"]["Enums"]["qa_status"];

interface DroneAsset {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  qa_status: QAStatus | null;
  qa_score: number | null;
  qa_results: Json | null;
  sort_order: number | null;
  created_at: string;
}

interface QAAssetGridProps {
  assets: DroneAsset[];
  onRefresh: () => void;
  showQADetails?: boolean;
}

const QA_STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; bg: string }> = {
  pending: { icon: Clock, color: "text-slate-500", bg: "bg-slate-100" },
  analyzing: { icon: Clock, color: "text-blue-500", bg: "bg-blue-100" },
  passed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-100" },
  failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-100" },
  approved: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
};

export default function QAAssetGrid({ assets, onRefresh, showQADetails = false }: QAAssetGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<DroneAsset | null>(null);

  const getStatusConfig = (status: QAStatus | null) => {
    return QA_STATUS_CONFIG[status || "pending"] || QA_STATUS_CONFIG.pending;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {assets.map((asset) => {
          const statusConfig = getStatusConfig(asset.qa_status);
          const StatusIcon = statusConfig.icon;

          return (
            <div
              key={asset.id}
              className="group relative rounded-lg border border-border bg-card overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                {asset.file_type?.startsWith("image") ? (
                  <img
                    src={asset.file_path}
                    alt={asset.file_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center text-muted-foreground text-xs p-2">
                    {asset.file_name}
                  </div>
                )}
              </div>

              {/* QA Status Overlay */}
              <div className="absolute top-2 right-2">
                <div className={`p-1 rounded-full ${statusConfig.bg}`}>
                  <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                </div>
              </div>

              {/* Score Badge */}
              {asset.qa_score !== null && (
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className={`${getScoreColor(asset.qa_score)} font-mono`}>
                    {asset.qa_score}
                  </Badge>
                </div>
              )}

              {/* Info Bar */}
              <div className="p-2">
                <p className="text-xs truncate text-muted-foreground">{asset.file_name}</p>
                {showQADetails && asset.qa_results && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-1 h-7 text-xs"
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View Details
                  </Button>
                )}
              </div>

              {/* Hover overlay for quick view */}
              {!showQADetails && (
                <div
                  className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => setSelectedAsset(asset)}
                >
                  <Button variant="secondary" size="sm">
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <QADetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onRefresh={onRefresh}
      />
    </>
  );
}
