import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/hooks/useAuditLogs';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MissionControlApp {
  id: string;
  name: string;
  code: string;
  status: 'online' | 'degraded' | 'offline';
  version: string | null;
  url: string | null;
  active: boolean;
  
  // API Key info
  api_key_prefix: string | null;
  api_key_created_at: string | null;
  
  // Health tracking
  health_check_url: string | null;
  heartbeat_interval_seconds: number;
  last_heartbeat_at: string | null;
  consecutive_failures: number;
  alert_on_failure: boolean;
  
  // Owner info
  owner_email: string | null;
  owner_name: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_health_check: string | null;
}

export interface AppStatusOverview {
  id: string;
  name: string;
  code: string;
  status: string;
  version: string | null;
  url: string | null;
  last_heartbeat_at: string | null;
  consecutive_failures: number;
  active: boolean;
  has_api_key: boolean;
  api_key_created_at: string | null;
  heartbeat_status: 'never' | 'recent' | 'stale' | 'offline';
  open_ticket_count: number;
}

export interface AppFormData {
  name: string;
  code: string;
  url?: string;
  health_check_url?: string;
  heartbeat_interval_seconds?: number;
  alert_on_failure?: boolean;
  owner_email?: string;
  owner_name?: string;
  active?: boolean;
}

// ============================================
// READ QUERIES
// ============================================

/**
 * Fetch all apps with status overview
 */
export function useMissionControlApps() {
  return useQuery({
    queryKey: ['mission-control-apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_status_overview')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as AppStatusOverview[];
    },
  });
}

/**
 * Fetch single app by ID
 */
export function useMissionControlApp(id: string) {
  return useQuery({
    queryKey: ['mission-control-app', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as MissionControlApp;
    },
    enabled: !!id,
  });
}

/**
 * Fetch health history for an app
 */
export function useAppHealthHistory(appId: string, limit = 100) {
  return useQuery({
    queryKey: ['app-health-history', appId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_health_history')
        .select('*')
        .eq('app_id', appId)
        .order('checked_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
    enabled: !!appId,
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Create a new app
 */
export function useCreateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AppFormData) => {
      const { data: inserted, error } = await supabase
        .from('apps')
        .insert([{
          name: data.name,
          code: data.code.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
          url: data.url || null,
          health_check_url: data.health_check_url || null,
          heartbeat_interval_seconds: data.heartbeat_interval_seconds || 300,
          alert_on_failure: data.alert_on_failure ?? true,
          owner_email: data.owner_email || null,
          owner_name: data.owner_name || null,
          active: data.active ?? true,
          status: 'offline',
        }])
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'created',
        tableName: 'apps',
        recordId: inserted.id,
        changesAfter: { ...data } as Record<string, unknown>,
        notes: `App "${data.name}" registered in Mission Control`,
      });

      return inserted as MissionControlApp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-apps'] });
    },
  });
}

/**
 * Update an existing app
 */
export function useUpdateApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AppFormData> }) => {
      const { data: updated, error } = await supabase
        .from('apps')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'updated',
        tableName: 'apps',
        recordId: id,
        changesAfter: data,
        notes: `App settings updated`,
      });

      return updated as MissionControlApp;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-apps'] });
      queryClient.invalidateQueries({ queryKey: ['mission-control-app', variables.id] });
    },
  });
}

/**
 * Generate API key for an app
 * Returns the plain key - ONLY TIME IT'S VISIBLE!
 */
export function useGenerateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appId, appName }: { appId: string; appName: string }) => {
      const { data, error } = await supabase
        .rpc('generate_app_api_key', { p_app_id: appId });

      if (error) throw error;

      await logAuditEvent({
        action: 'updated',
        tableName: 'apps',
        recordId: appId,
        changesAfter: { api_key_generated: true },
        notes: `API key generated for "${appName}"`,
      });

      return data as string; // The plain API key
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-apps'] });
    },
  });
}

/**
 * Revoke API key for an app
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appId, appName }: { appId: string; appName: string }) => {
      const { data, error } = await supabase
        .rpc('revoke_app_api_key', { p_app_id: appId });

      if (error) throw error;

      await logAuditEvent({
        action: 'updated',
        tableName: 'apps',
        recordId: appId,
        changesAfter: { api_key_revoked: true },
        notes: `API key revoked for "${appName}"`,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-apps'] });
    },
  });
}

/**
 * Delete an app
 */
export function useDeleteApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'deleted',
        tableName: 'apps',
        recordId: id,
        changesBefore: { name },
        notes: `App "${name}" removed from Mission Control`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-apps'] });
    },
  });
}

// ============================================
// ANNOUNCEMENTS
// ============================================

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'outage' | 'resolved';
  target_all_apps: boolean;
  target_app_ids: string[];
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementFormData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'outage' | 'resolved';
  target_all_apps?: boolean;
  target_app_ids?: string[];
  starts_at?: string;
  ends_at?: string | null;
  is_active?: boolean;
  priority?: number;
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ['mission-control-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_announcements')
        .select('*');

      if (error) throw error;
      return data as (Announcement & { display_status: string })[];
    },
  });
}

export function useAllAnnouncements() {
  return useQuery({
    queryKey: ['mission-control-all-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      const { data: inserted, error } = await supabase
        .from('maintenance_announcements')
        .insert([{
          title: data.title,
          message: data.message,
          type: data.type,
          target_all_apps: data.target_all_apps ?? true,
          target_app_ids: data.target_app_ids || [],
          starts_at: data.starts_at || new Date().toISOString(),
          ends_at: data.ends_at || null,
          is_active: data.is_active ?? true,
          priority: data.priority || 0,
        }])
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'created',
        tableName: 'maintenance_announcements',
        recordId: inserted.id,
        changesAfter: { ...data } as Record<string, unknown>,
        notes: `Announcement "${data.title}" created`,
      });

      return inserted as Announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['mission-control-all-announcements'] });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AnnouncementFormData> }) => {
      const { data: updated, error } = await supabase
        .from('maintenance_announcements')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'updated',
        tableName: 'maintenance_announcements',
        recordId: id,
        changesAfter: data,
        notes: `Announcement updated`,
      });

      return updated as Announcement;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['mission-control-all-announcements'] });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from('maintenance_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEvent({
        action: 'deleted',
        tableName: 'maintenance_announcements',
        recordId: id,
        changesBefore: { title },
        notes: `Announcement "${title}" deleted`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mission-control-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['mission-control-all-announcements'] });
    },
  });
}