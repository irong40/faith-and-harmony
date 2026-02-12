import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkipForward, RefreshCw } from 'lucide-react';

interface CoverageActionsProps {
  onOverride: () => void;
  onRetrigger: () => void;
  isLoading: boolean;
  hasMissingShots: boolean;
}

export default function CoverageActions({
  onOverride,
  onRetrigger,
  isLoading,
  hasMissingShots,
}: CoverageActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          className="w-full"
          variant="outline"
          onClick={onOverride}
          disabled={isLoading}
        >
          <SkipForward className="mr-2 h-4 w-4" />
          Override & Proceed
        </Button>
        <Button
          className="w-full"
          onClick={onRetrigger}
          disabled={isLoading || !hasMissingShots}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Re-trigger After Adding Photos
        </Button>
        <p className="text-xs text-muted-foreground">
          Override will proceed without the missing shots. Re-trigger will re-run
          coverage validation after new photos have been uploaded.
        </p>
      </CardContent>
    </Card>
  );
}
