import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface DeadLetterBannerProps {
  count: number;
  onRetry: () => void;
  retrying?: boolean;
}

export function DeadLetterBanner({ count, onRetry, retrying }: DeadLetterBannerProps) {
  if (count === 0) return null;

  const label = count === 1 ? '1 item' : `${count} items`;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-2">
        <span>{label} failed to sync after multiple attempts.</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? 'Retrying...' : 'Retry All'}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
