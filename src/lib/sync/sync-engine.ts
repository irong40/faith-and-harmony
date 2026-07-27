import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import {
  getSyncQueue,
  removeSyncItem,
  updateSyncItem,
  moveToDeadLetter,
  getDeadLetterCount,
  putAll,
  STORES,
} from './db';
import type { SyncQueueItem } from './db';
import { isNetworkAvailable } from './network-probe';

const MAX_RETRIES = 5;

/**
 * The replay path deliberately talks to the *untyped* PostgREST surface.
 *
 * `executeAction` is a generic replay buffer: the table comes off an IndexedDB
 * row at runtime and the payload is whatever JSON was queued days ago. There is
 * no compile-time table literal to key the generated `Database` types off, so
 * asking PostgREST's per-table `Insert`/`Update` generics to validate it is not
 * a check that can succeed — it just resolves the whole table union at every
 * call site and either fails (TS2769) or runs out of instantiation budget
 * (TS2589).
 *
 * Type safety for these writes lives at the *enqueue* sites instead, where the
 * table and payload are literals: `SyncTable` is a closed union, and each
 * `addToSyncQueue` caller is checked against it.
 *
 * Note this is a narrowing to a real, supported client type — `error` and
 * `data` stay typed — not an `as never` / `@ts-ignore` erasure.
 */
const genericTables = supabase as unknown as SupabaseClient;

let processingQueue = false;

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

type SyncListener = (status: SyncStatus, pending: number) => void;

const listeners = new Set<SyncListener>();

export function onSyncStatusChange(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(status: SyncStatus, pending: number) {
  listeners.forEach(fn => fn(status, pending));
}

async function executeAction(item: SyncQueueItem): Promise<boolean> {
  const { action, table, payload } = item;

  // One factory, called per operation.
  //
  // Two things are load-bearing. (1) TypeScript resolves the shape of
  // `from(table)` exactly once — for this arrow's inferred return type —
  // instead of re-resolving it at all eight call sites below, which is what
  // pushed this function past the type instantiation budget (TS2589).
  // (2) It is a factory, not a hoisted variable: PostgrestQueryBuilder mutates
  // its own `url.searchParams` and `headers` and hands those same objects to
  // the filter builder it returns, so sharing one builder across a
  // delete-then-insert pair would leak query state between the two requests.
  // Each call gets a fresh builder.
  const from = () => genericTables.from(table);

  switch (action) {
    case 'insert_flight_log': {
      const { error } = await from().insert(payload);
      if (error) throw error;
      return true;
    }

    case 'upsert_equipment': {
      const missionId = payload.mission_id as string;
      await from().delete().eq('mission_id', missionId);
      const { error } = await from().insert(payload).select().single();
      if (error) throw error;
      return true;
    }

    case 'insert_weather_briefing': {
      const { error } = await from().insert(payload).select().single();
      if (error) throw error;
      return true;
    }

    case 'save_authorization': {
      const authMissionId = payload.mission_id as string;
      await from().delete().eq('mission_id', authMissionId);
      const { error } = await from().insert(payload).select().single();
      if (error) throw error;
      return true;
    }

    case 'update_mission_status': {
      const id = payload.id as string;
      const status = payload.status as string;
      const { error } = await from().update({ status }).eq('id', id);
      if (error) throw error;
      return true;
    }

    case 'insert_record': {
      const { _offline_id, ...insertPayload } = payload;
      const { error } = await from().insert(insertPayload);
      if (error) throw error;
      return true;
    }

    case 'update_record': {
      const { _record_id, ...updatePayload } = payload;
      const { error } = await from().update(updatePayload).eq('id', _record_id as string);
      if (error) throw error;
      return true;
    }

    case 'delete_record': {
      const deleteId = payload._record_id as string;
      const { error } = await from().delete().eq('id', deleteId);
      if (error) throw error;
      return true;
    }

    default:
      console.warn(`Unknown sync action: ${action}`);
      return false;
  }
}

export async function processQueue(): Promise<number> {
  if (!(await isNetworkAvailable())) {
    notify('offline', 0);
    return 0;
  }

  if (processingQueue) return 0;
  processingQueue = true;

  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) {
      notify('idle', 0);
      return 0;
    }

    notify('syncing', queue.length);
    let processed = 0;
    let movedToDeadLetter = false;

    for (const item of queue) {
      if (!item.id) continue;

      try {
        const success = await executeAction(item);
        if (success) {
          await removeSyncItem(item.id);
          processed++;
        }
      } catch (error: any) {
        const retries = item.retries + 1;
        if (retries >= MAX_RETRIES) {
          console.error(`Sync item ${item.id} exceeded max retries, moving to dead letter`);
          await moveToDeadLetter(item, error.message || 'Unknown error');
          await removeSyncItem(item.id);
          movedToDeadLetter = true;
        } else {
          await updateSyncItem({
            ...item,
            retries,
            last_error: error.message || 'Unknown error',
          });
        }
      }
    }

    if (movedToDeadLetter) {
      await getDeadLetterCount();
    }

    const remaining = (await getSyncQueue()).length;
    notify(remaining > 0 ? 'error' : 'idle', remaining);
    return processed;
  } finally {
    processingQueue = false;
  }
}

export async function pullMissions(pilotId: string): Promise<void> {
  if (!(await isNetworkAvailable())) return;

  const { data, error } = await supabase
    .from('drone_jobs')
    .select('*, clients(name), drone_packages(id, name, code)')
    .eq('pilot_id', pilotId)
    .neq('status', 'canceled')
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  if (data) {
    await putAll(STORES.MISSIONS, data);
  }
}

export async function pullFleet(): Promise<void> {
  if (!(await isNetworkAvailable())) return;

  const [aircraft, batteries, controllers, accessories] = await Promise.all([
    supabase.from('aircraft').select('*').order('model'),
    supabase.from('batteries').select('*').order('serial_number'),
    supabase.from('controllers').select('*').order('model'),
    supabase.from('accessories').select('*').order('name'),
  ]);

  const fleetData = [
    ...(aircraft.data || []).map(a => ({ ...a, _type: 'aircraft' })),
    ...(batteries.data || []).map(b => ({ ...b, _type: 'battery' })),
    ...(controllers.data || []).map(c => ({ ...c, _type: 'controller' })),
    ...(accessories.data || []).map(a => ({ ...a, _type: 'accessory' })),
  ];

  await putAll(STORES.FLEET, fleetData);
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30_000): void {
  if (syncInterval) return;

  // Process queue on connectivity restore
  window.addEventListener('online', () => {
    processQueue();
  });

  // Periodic sync
  syncInterval = setInterval(() => {
    processQueue();
  }, intervalMs);

  // Initial sync
  processQueue();
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
