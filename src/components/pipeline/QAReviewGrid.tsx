import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import QAReviewAssetCard from './QAReviewAssetCard';
import type { DroneAsset } from '@/types/drone';

interface QAReviewGridProps {
  assets: DroneAsset[];
  onAction: (assetId: string, action: 'approve' | 'exclude' | 'reshoot') => void;
  onBatchApproveWarnings: () => void;
  onBatchExcludeFailed: () => void;
  isActioning: boolean;
}

export default function QAReviewGrid({
  assets,
  onAction,
  onBatchApproveWarnings,
  onBatchExcludeFailed,
  isActioning,
}: QAReviewGridProps) {
  const warnings = assets.filter((a) => a.qa_status === 'warning');
  const failed = assets.filter((a) => a.qa_status === 'failed');

  return (
    <div className="space-y-6">
      {/* Batch Actions */}
      <div className="flex flex-wrap gap-2">
        {warnings.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchApproveWarnings}
            disabled={isActioning}
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Approve All Warnings ({warnings.length})
          </Button>
        )}
        {failed.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBatchExcludeFailed}
            disabled={isActioning}
          >
            <XCircle className="mr-2 h-4 w-4 text-red-600" />
            Exclude All Failed ({failed.length})
          </Button>
        )}
      </div>

      {/* Asset Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {assets.map((asset) => (
          <QAReviewAssetCard
            key={asset.id}
            asset={asset}
            onAction={onAction}
            isActioning={isActioning}
          />
        ))}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No assets requiring QA review
        </div>
      )}
    </div>
  );
}
