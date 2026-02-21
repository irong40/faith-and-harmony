const DB_NAME = 'trestle_offline';
const DB_VERSION = 1;

export const STORES = {
  SYNC_QUEUE: 'sync_queue',
  MISSIONS: 'missions_cache',
  FLEET: 'fleet_cache',
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
