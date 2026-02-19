import { useState, useEffect, useCallback } from 'react';
import {
  processQueue,
  onSyncStatusChange,
  startAutoSync,
  stopAutoSync,
  pullMissions,
  pullFleet,
} from '@/lib/sync/sync-engine';
import { addToSyncQueue, getSyncQueue } from '@/lib/sync/db';
import type { SyncAction, SyncQueueItem } from '@/lib/sync/db';
import type { SyncStatus } from '@/lib/sync/sync-engine';

export function useOfflineSync(pilotId?: string) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onSyncStatusChange((status, pending) => {
      setSyncStatus(status);
      setPendingCount(pending);
    });

    startAutoSync();

    // Load initial pending count
    getSyncQueue().then(q => setPendingCount(q.length));

    return () => {
      unsubscribe();
      stopAutoSync();
    };
  }, []);

  const enqueue = useCallback(async (
    action: SyncAction,
    table: string,
    payload: Record<string, unknown>,
  ) => {
    const item: Omit<SyncQueueItem, 'id'> = {
      action,
      table,
      payload,
      created_at: new Date().toISOString(),
      retries: 0,
      last_error: null,
    };

    await addToSyncQueue(item);
    setPendingCount(prev => prev + 1);

    // Try immediate sync if online
    if (navigator.onLine) {
      processQueue();
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return;

    setSyncStatus('syncing');

    try {
      // Push pending changes
      await processQueue();

      // Pull fresh data
      if (pilotId) {
        await pullMissions(pilotId);
      }
      await pullFleet();
    } catch {
      setSyncStatus('error');
    }
  }, [pilotId]);

  return {
    syncStatus,
    pendingCount,
    isOnline,
    enqueue,
    syncNow,
  };
}
