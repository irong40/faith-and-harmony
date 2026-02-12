import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, RotateCcw, Camera } from 'lucide-react';
import type { DroneAsset, QAResults } from '@/types/drone';

interface QAReviewAssetCardProps {
  asset: DroneAsset;
  onAction: (assetId: string, action: 'approve' | 'exclude' | 'reshoot') => void;
  isActioning: boolean;
}

export default function QAReviewAssetCard({
  asset,
  onAction,
  isActioning,
}: QAReviewAssetCardProps) {
  const qaResults = asset.qa_results as unknown as QAResults | null;
  const reasons =
    qaResults?.issues
      ?.filter((i) => i.severity === 'high' || i.severity === 'critical')
      .map((i) => i.description) || [];

  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted flex items-center justify-center">
        <Camera className="h-10 w-10 text-muted-foreground/30" />
      </div>
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-mono truncate" title={asset.file_name}>
          {asset.file_name}
        </p>

        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={
              asset.qa_status === 'failed'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }
          >
            {asset.qa_status}
          </Badge>
          {asset.qa_score !== null && (
            <span className="text-sm font-medium">{asset.qa_score}</span>
          )}
        </div>

        {reasons.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {reasons.slice(0, 3).map((r, i) => (
              <li key={i}>- {r}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-1 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-green-600 hover:bg-green-50"
            onClick={() => onAction(asset.id, 'approve')}
            disabled={isActioning}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-red-600 hover:bg-red-50"
            onClick={() => onAction(asset.id, 'exclude')}
            disabled={isActioning}
          >
            <XCircle className="mr-1 h-3 w-3" />
            Exclude
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-amber-600 hover:bg-amber-50"
            onClick={() => onAction(asset.id, 'reshoot')}
            disabled={isActioning}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reshoot
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
