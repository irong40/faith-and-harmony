import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { SyncStatus } from '@/lib/sync/sync-engine';

interface SyncStatusIndicatorProps {
  status: SyncStatus;
  pendingCount: number;
  isOnline: boolean;
  onSync: () => void;
}

const STATUS_CONFIG: Record<SyncStatus, { icon: typeof CheckCircle2; label: string; color: string }> = {
  idle: { icon: CheckCircle2, label: 'Synced', color: 'text-green-500' },
  syncing: { icon: Loader2, label: 'Syncing', color: 'text-blue-500' },
  error: { icon: AlertCircle, label: 'Sync Error', color: 'text-amber-500' },
  offline: { icon: WifiOff, label: 'Offline', color: 'text-muted-foreground' },
};

export default function SyncStatusIndicator({
  status,
  pendingCount,
  isOnline,
  onSync,
}: SyncStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isSyncing = status === 'syncing';

  return (
    <div className="flex items-center gap-2">
      {/* Online/Offline indicator */}
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-muted-foreground" />
      )}

      {/* Sync status */}
      <div className={`flex items-center gap-1 ${config.color}`}>
        <Icon className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
        <span className="text-xs">{config.label}</span>
      </div>

      {/* Pending count */}
      {pendingCount > 0 && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {pendingCount}
        </Badge>
      )}

      {/* Manual sync button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onSync}
        disabled={isSyncing || !isOnline}
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
