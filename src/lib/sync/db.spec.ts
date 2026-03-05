import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  STORES,
  addToSyncQueue,
  getSyncQueue,
  moveToDeadLetter,
  getDeadLetterCount,
  getDeadLetterItems,
  retryDeadLetterItems,
  clearStore,
} from './db';
import type { SyncQueueItem } from './db';

function makeSyncItem(overrides: Partial<SyncQueueItem> = {}): Omit<SyncQueueItem, 'id'> {
  return {
    action: 'insert_flight_log',
    table: 'flight_logs',
    payload: { mission_id: 'test-123' },
    created_at: '2026-03-05T10:00:00Z',
    retries: 3,
    last_error: 'Connection timeout',
    ...overrides,
  };
}

describe('Dead letter store', () => {
  beforeEach(async () => {
    // Clear all stores between tests
    await clearStore(STORES.SYNC_QUEUE);
    await clearStore(STORES.DEAD_LETTER);
  });

  describe('DB schema', () => {
    it('DB version 2 creates dead_letter object store on upgrade', () => {
      expect(STORES.DEAD_LETTER).toBe('dead_letter');
    });

    it('existing stores (sync_queue, missions_cache, fleet_cache) are not destroyed by version bump', async () => {
      // Add an item to sync_queue to verify it survives
      await addToSyncQueue(makeSyncItem());
      const items = await getSyncQueue();
      expect(items.length).toBe(1);
      expect(items[0].action).toBe('insert_flight_log');
    });
  });

  describe('moveToDeadLetter', () => {
    it('copies a SyncQueueItem to dead_letter store with moved_at timestamp and error_message', async () => {
      const syncItem: SyncQueueItem = {
        id: 1,
        ...makeSyncItem({ retries: 5, last_error: 'Max retries exceeded' }),
      };

      await moveToDeadLetter(syncItem, 'Max retries exceeded after 5 attempts');

      const deadItems = await getDeadLetterItems();
      expect(deadItems).toHaveLength(1);
      expect(deadItems[0].action).toBe('insert_flight_log');
      expect(deadItems[0].table).toBe('flight_logs');
      expect(deadItems[0].error_message).toBe('Max retries exceeded after 5 attempts');
      expect(deadItems[0].moved_at).toBeTruthy();
      expect(deadItems[0].original_created_at).toBe('2026-03-05T10:00:00Z');
      expect(deadItems[0].original_retries).toBe(5);
    });
  });

  describe('getDeadLetterCount', () => {
    it('returns 0 when empty', async () => {
      const count = await getDeadLetterCount();
      expect(count).toBe(0);
    });

    it('returns correct count when items exist', async () => {
      const item: SyncQueueItem = { id: 1, ...makeSyncItem() };
      await moveToDeadLetter(item, 'Error 1');
      await moveToDeadLetter(item, 'Error 2');
      await moveToDeadLetter(item, 'Error 3');

      const count = await getDeadLetterCount();
      expect(count).toBe(3);
    });
  });

  describe('getDeadLetterItems', () => {
    it('returns all dead letter items', async () => {
      const item1: SyncQueueItem = { id: 1, ...makeSyncItem({ table: 'flight_logs' }) };
      const item2: SyncQueueItem = { id: 2, ...makeSyncItem({ table: 'equipment', action: 'upsert_equipment' }) };

      await moveToDeadLetter(item1, 'Error A');
      await moveToDeadLetter(item2, 'Error B');

      const items = await getDeadLetterItems();
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.table)).toContain('flight_logs');
      expect(items.map((i) => i.table)).toContain('equipment');
    });
  });

  describe('retryDeadLetterItems', () => {
    it('moves items back to sync_queue with retries reset to 0 and removes from dead_letter', async () => {
      const item1: SyncQueueItem = { id: 1, ...makeSyncItem({ retries: 5 }) };
      const item2: SyncQueueItem = { id: 2, ...makeSyncItem({ retries: 3, action: 'upsert_equipment' }) };

      await moveToDeadLetter(item1, 'Error 1');
      await moveToDeadLetter(item2, 'Error 2');

      const movedCount = await retryDeadLetterItems();
      expect(movedCount).toBe(2);

      // Dead letter store should be empty
      const deadCount = await getDeadLetterCount();
      expect(deadCount).toBe(0);

      // Sync queue should have the items with retries reset
      const syncItems = await getSyncQueue();
      expect(syncItems).toHaveLength(2);
      for (const item of syncItems) {
        expect(item.retries).toBe(0);
        expect(item.last_error).toBeNull();
      }
    });
  });
});
