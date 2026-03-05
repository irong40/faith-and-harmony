import { useState, useEffect, useCallback } from 'react';
import { getDeadLetterCount, retryDeadLetterItems } from '@/lib/sync/db';
import { onSyncStatusChange, processQueue } from '@/lib/sync/sync-engine';

export function useDeadLetterCount() {
  const [deadLetterCount, setDeadLetterCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getDeadLetterCount();
      setDeadLetterCount(count);
    } catch {
      // IndexedDB unavailable or error, keep current count
    }
  }, []);

  useEffect(() => {
    refreshCount();

    const unsubscribe = onSyncStatusChange(() => {
      refreshCount();
    });

    return unsubscribe;
  }, [refreshCount]);

  const retryAll = useCallback(async () => {
    const moved = await retryDeadLetterItems();
    await refreshCount();
    if (moved > 0) {
      processQueue();
    }
  }, [refreshCount]);

  return { deadLetterCount, retryAll };
}
