import { supabase } from '@/integrations/supabase/client';
import {
  getSyncQueue,
  removeSyncItem,
  updateSyncItem,
  putAll,
  STORES,
} from './db';
import type { SyncQueueItem } from './db';

const MAX_RETRIES = 5;

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

  switch (action) {
    case 'insert_flight_log': {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      return true;
    }

    case 'upsert_equipment': {
      const missionId = payload.mission_id as string;
      await supabase.from(table).delete().eq('mission_id', missionId);
      const { error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return true;
    }

    case 'insert_weather_briefing': {
      const { error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return true;
    }

    case 'save_authorization': {
      const authMissionId = payload.mission_id as string;
      await supabase.from(table).delete().eq('mission_id', authMissionId);
      const { error } = await supabase.from(table).insert(payload).select().single();
      if (error) throw error;
      return true;
    }

    case 'update_mission_status': {
      const id = payload.id as string;
      const status = payload.status as string;
      const { error } = await supabase.from(table).update({ status }).eq('id', id);
      if (error) throw error;
      return true;
    }

    default:
      console.warn(`Unknown sync action: ${action}`);
      return false;
  }
}

export async function processQueue(): Promise<number> {
  if (!navigator.onLine) {
    notify('offline', 0);
    return 0;
  }

  const queue = await getSyncQueue();
  if (queue.length === 0) {
    notify('idle', 0);
    return 0;
  }

  notify('syncing', queue.length);
  let processed = 0;

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
        console.error(`Sync item ${item.id} exceeded max retries, removing:`, error.message);
        await removeSyncItem(item.id);
      } else {
        await updateSyncItem({
          ...item,
          retries,
          last_error: error.message || 'Unknown error',
        });
      }
    }
  }

  const remaining = (await getSyncQueue()).length;
  notify(remaining > 0 ? 'error' : 'idle', remaining);
  return processed;
}

export async function pullMissions(pilotId: string): Promise<void> {
  if (!navigator.onLine) return;

  const { data, error } = await supabase
    .from('drone_jobs')
    .select('*, customers(name), drone_packages(id, name, code)')
    .eq('pilot_id', pilotId)
    .neq('status', 'canceled')
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  if (data) {
    await putAll(STORES.MISSIONS, data);
  }
}

export async function pullFleet(): Promise<void> {
  if (!navigator.onLine) return;

  const [aircraft, batteries, controllers] = await Promise.all([
    supabase.from('aircraft').select('*').order('model'),
    supabase.from('batteries').select('*').order('serial_number'),
    supabase.from('controllers').select('*').order('model'),
  ]);

  const fleetData = [
    ...(aircraft.data || []).map(a => ({ ...a, _type: 'aircraft' })),
    ...(batteries.data || []).map(b => ({ ...b, _type: 'battery' })),
    ...(controllers.data || []).map(c => ({ ...c, _type: 'controller' })),
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
