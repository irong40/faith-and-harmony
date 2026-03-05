const DB_NAME = 'trestle_offline';
const DB_VERSION = 2;

export const STORES = {
  SYNC_QUEUE: 'sync_queue',
  MISSIONS: 'missions_cache',
  FLEET: 'fleet_cache',
  DEAD_LETTER: 'dead_letter',
} as const;

export type SyncAction =
  | 'insert_flight_log'
  | 'upsert_equipment'
  | 'insert_weather_briefing'
  | 'save_authorization'
  | 'update_mission_status'
  | 'insert_record'
  | 'update_record'
  | 'delete_record';

export interface SyncQueueItem {
  id?: number;
  action: SyncAction;
  table: string;
  payload: Record<string, unknown>;
  created_at: string;
  retries: number;
  last_error: string | null;
}

export interface DeadLetterItem {
  id?: number;
  action: SyncAction;
  table: string;
  payload: Record<string, unknown>;
  original_created_at: string;
  moved_at: string;
  error_message: string;
  original_retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
      }

      if (!db.objectStoreNames.contains(STORES.MISSIONS)) {
        const store = db.createObjectStore(STORES.MISSIONS, { keyPath: 'id' });
        store.createIndex('pilot_id', 'pilot_id', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.FLEET)) {
        db.createObjectStore(STORES.FLEET, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.DEAD_LETTER)) {
        const store = db.createObjectStore(STORES.DEAD_LETTER, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('moved_at', 'moved_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function put<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putAll<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function remove(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  await put(STORES.SYNC_QUEUE, item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
}

export async function removeSyncItem(id: number): Promise<void> {
  await remove(STORES.SYNC_QUEUE, id);
}

export async function updateSyncItem(item: SyncQueueItem): Promise<void> {
  await put(STORES.SYNC_QUEUE, item);
}

export async function moveToDeadLetter(item: SyncQueueItem, errorMessage: string): Promise<void> {
  const deadLetterItem: DeadLetterItem = {
    action: item.action,
    table: item.table,
    payload: item.payload,
    original_created_at: item.created_at,
    moved_at: new Date().toISOString(),
    error_message: errorMessage,
    original_retries: item.retries,
  };
  await put(STORES.DEAD_LETTER, deadLetterItem);
}

export async function getDeadLetterCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DEAD_LETTER, 'readonly');
    const store = tx.objectStore(STORES.DEAD_LETTER);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getDeadLetterItems(): Promise<DeadLetterItem[]> {
  return getAll<DeadLetterItem>(STORES.DEAD_LETTER);
}

export async function retryDeadLetterItems(): Promise<number> {
  const deadItems = await getDeadLetterItems();
  if (deadItems.length === 0) return 0;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SYNC_QUEUE, STORES.DEAD_LETTER], 'readwrite');
    const syncStore = tx.objectStore(STORES.SYNC_QUEUE);
    const deadStore = tx.objectStore(STORES.DEAD_LETTER);

    for (const deadItem of deadItems) {
      const syncItem: Omit<SyncQueueItem, 'id'> = {
        action: deadItem.action,
        table: deadItem.table,
        payload: deadItem.payload,
        created_at: deadItem.original_created_at,
        retries: 0,
        last_error: null,
      };
      syncStore.add(syncItem);
    }

    deadStore.clear();

    tx.oncomplete = () => resolve(deadItems.length);
    tx.onerror = () => reject(tx.error);
  });
}
