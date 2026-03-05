import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock network-probe
const mockIsNetworkAvailable = vi.fn<() => Promise<boolean>>();
vi.mock('./network-probe', () => ({
  isNetworkAvailable: () => mockIsNetworkAvailable(),
}));

// Mock db module
const mockGetSyncQueue = vi.fn<() => Promise<any[]>>();
const mockRemoveSyncItem = vi.fn<() => Promise<void>>();
const mockUpdateSyncItem = vi.fn<() => Promise<void>>();
const mockMoveToDeadLetter = vi.fn<() => Promise<void>>();
const mockPutAll = vi.fn<() => Promise<void>>();
const mockGetDeadLetterCount = vi.fn<() => Promise<number>>();

vi.mock('./db', () => ({
  getSyncQueue: () => mockGetSyncQueue(),
  removeSyncItem: (id: number) => mockRemoveSyncItem(id),
  updateSyncItem: (item: any) => mockUpdateSyncItem(item),
  moveToDeadLetter: (item: any, msg: string) => mockMoveToDeadLetter(item, msg),
  putAll: (store: string, items: any[]) => mockPutAll(store, items),
  getDeadLetterCount: () => mockGetDeadLetterCount(),
  STORES: {
    SYNC_QUEUE: 'sync_queue',
    MISSIONS: 'missions_cache',
    FLEET: 'fleet_cache',
    DEAD_LETTER: 'dead_letter',
  },
}));

// Mock supabase
const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

describe('sync-engine', () => {
  let processQueue: typeof import('./sync-engine').processQueue;
  let pullMissions: typeof import('./sync-engine').pullMissions;
  let pullFleet: typeof import('./sync-engine').pullFleet;
  let onSyncStatusChange: typeof import('./sync-engine').onSyncStatusChange;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mockIsNetworkAvailable.mockResolvedValue(true);
    mockGetSyncQueue.mockResolvedValue([]);
    mockRemoveSyncItem.mockResolvedValue(undefined);
    mockUpdateSyncItem.mockResolvedValue(undefined);
    mockMoveToDeadLetter.mockResolvedValue(undefined);
    mockPutAll.mockResolvedValue(undefined);
    mockGetDeadLetterCount.mockResolvedValue(0);

    const mod = await import('./sync-engine');
    processQueue = mod.processQueue;
    pullMissions = mod.pullMissions;
    pullFleet = mod.pullFleet;
    onSyncStatusChange = mod.onSyncStatusChange;
  });

  it('calls isNetworkAvailable instead of navigator.onLine', async () => {
    mockIsNetworkAvailable.mockResolvedValue(true);
    mockGetSyncQueue.mockResolvedValue([]);

    await processQueue();

    expect(mockIsNetworkAvailable).toHaveBeenCalled();
  });

  it('returns early with offline status when isNetworkAvailable returns false', async () => {
    mockIsNetworkAvailable.mockResolvedValue(false);
    const listener = vi.fn();
    onSyncStatusChange(listener);

    const result = await processQueue();

    expect(result).toBe(0);
    expect(listener).toHaveBeenCalledWith('offline', 0);
    expect(mockGetSyncQueue).not.toHaveBeenCalled();
  });

  it('moves item to dead letter when retries >= MAX_RETRIES', async () => {
    const failItem = {
      id: 1,
      action: 'insert_flight_log' as const,
      table: 'flight_logs',
      payload: { mission_id: 'abc' },
      created_at: '2026-01-01T00:00:00Z',
      retries: 4, // will become 5, which >= MAX_RETRIES (5)
      last_error: null,
    };
    mockGetSyncQueue
      .mockResolvedValueOnce([failItem])
      .mockResolvedValueOnce([]);

    // Make the action throw
    mockFrom.mockReturnValue({
      insert: () => ({ error: new Error('Server error') }),
    });

    await processQueue();

    expect(mockMoveToDeadLetter).toHaveBeenCalledWith(failItem, expect.any(String));
    expect(mockRemoveSyncItem).toHaveBeenCalledWith(1);
  });

  it('prevents concurrent processQueue calls via mutex', async () => {
    let resolveFirst: () => void;
    const firstCallPromise = new Promise<void>(r => { resolveFirst = r; });

    mockGetSyncQueue.mockImplementation(async () => {
      // First call hangs until we resolve
      await firstCallPromise;
      return [];
    });

    const p1 = processQueue();
    const p2 = processQueue(); // should return 0 immediately due to mutex

    // Resolve the first call
    resolveFirst!();
    const [r1, r2] = await Promise.all([p1, p2]);

    // Second call returned 0 (mutex blocked), getSyncQueue called only once
    expect(r2).toBe(0);
    expect(mockGetSyncQueue).toHaveBeenCalledTimes(1);
  });

  it('pullMissions calls isNetworkAvailable and returns early when false', async () => {
    mockIsNetworkAvailable.mockResolvedValue(false);

    await pullMissions('pilot-123');

    expect(mockIsNetworkAvailable).toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('pullFleet calls isNetworkAvailable and returns early when false', async () => {
    mockIsNetworkAvailable.mockResolvedValue(false);

    await pullFleet();

    expect(mockIsNetworkAvailable).toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('notifies listeners with dead letter count when items are moved', async () => {
    const failItem = {
      id: 2,
      action: 'insert_flight_log' as const,
      table: 'flight_logs',
      payload: { mission_id: 'def' },
      created_at: '2026-01-01T00:00:00Z',
      retries: 4,
      last_error: null,
    };
    mockGetSyncQueue
      .mockResolvedValueOnce([failItem])
      .mockResolvedValueOnce([]);

    mockFrom.mockReturnValue({
      insert: () => ({ error: new Error('Fail') }),
    });

    mockGetDeadLetterCount.mockResolvedValue(1);

    const listener = vi.fn();
    onSyncStatusChange(listener);

    await processQueue();

    // Should have notified with dead letter info at some point
    expect(mockGetDeadLetterCount).toHaveBeenCalled();
    // Final notify should include dead letter awareness
    const calls = listener.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
  });
});
