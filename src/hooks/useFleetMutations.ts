import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Aircraft, Battery, Controller, MaintenanceLogEntry } from '@/types/fleet';

// ── Aircraft ──

interface AircraftInput {
  model: string;
  serial_number: string;
  nickname?: string | null;
  faa_registration?: string | null;
  firmware_version?: string | null;
  insurance_expiry?: string | null;
  purchase_date?: string | null;
  status?: string;
  notes?: string | null;
}

export function useCreateAircraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AircraftInput) => {
      const { data, error } = await supabase
        .from('aircraft')
        .insert({
          model: input.model,
          serial_number: input.serial_number,
          nickname: input.nickname || null,
          faa_registration: input.faa_registration || null,
          firmware_version: input.firmware_version || null,
          insurance_expiry: input.insurance_expiry || null,
          purchase_date: input.purchase_date || null,
          status: input.status || 'active',
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Aircraft;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-aircraft-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-aircraft-active'] });
    },
  });
}

export function useUpdateAircraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: AircraftInput & { id: string }) => {
      const { data, error } = await supabase
        .from('aircraft')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Aircraft;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-aircraft-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-aircraft-active'] });
    },
  });
}

export function useDeleteAircraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('aircraft').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-aircraft-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-aircraft-active'] });
    },
  });
}

// ── Batteries ──

interface BatteryInput {
  serial_number: string;
  model?: string | null;
  capacity_mah: number;
  aircraft_id?: string | null;
  status?: string;
  purchase_date?: string | null;
  notes?: string | null;
}

export function useCreateBattery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: BatteryInput) => {
      const { data, error } = await supabase
        .from('batteries')
        .insert({
          serial_number: input.serial_number,
          model: input.model || null,
          capacity_mah: input.capacity_mah,
          aircraft_id: input.aircraft_id || null,
          status: input.status || 'active',
          purchase_date: input.purchase_date || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Battery;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-batteries-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-batteries-active'] });
    },
  });
}

export function useUpdateBattery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: BatteryInput & { id: string }) => {
      const { data, error } = await supabase
        .from('batteries')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Battery;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-batteries-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-batteries-active'] });
    },
  });
}

export function useDeleteBattery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('batteries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-batteries-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-batteries-active'] });
    },
  });
}

// ── Controllers ──

interface ControllerInput {
  model: string;
  serial_number: string;
  firmware_version?: string | null;
  paired_aircraft_id?: string | null;
  status?: string;
  notes?: string | null;
}

export function useCreateController() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ControllerInput) => {
      const { data, error } = await supabase
        .from('controllers')
        .insert({
          model: input.model,
          serial_number: input.serial_number,
          firmware_version: input.firmware_version || null,
          paired_aircraft_id: input.paired_aircraft_id || null,
          status: input.status || 'active',
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Controller;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-controllers-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-controllers-active'] });
    },
  });
}

export function useUpdateController() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ControllerInput & { id: string }) => {
      const { data, error } = await supabase
        .from('controllers')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Controller;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-controllers-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-controllers-active'] });
    },
  });
}

export function useDeleteController() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('controllers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet-controllers-all'] });
      qc.invalidateQueries({ queryKey: ['fleet-controllers-active'] });
    },
  });
}

// ── Maintenance Log ──

interface MaintenanceInput {
  equipment_id: string;
  equipment_type: 'aircraft' | 'battery' | 'controller' | 'accessory';
  maintenance_type: 'scheduled' | 'unscheduled' | 'repair' | 'inspection' | 'firmware_update' | 'calibration';
  description?: string | null;
  performed_at?: string;
  cost_cents?: number | null;
  parts_used?: string[] | null;
  next_due_date?: string | null;
  notes?: string | null;
}

export function useCreateMaintenanceEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MaintenanceInput) => {
      const { data, error } = await supabase
        .from('maintenance_log')
        .insert({
          equipment_id: input.equipment_id,
          equipment_type: input.equipment_type,
          maintenance_type: input.maintenance_type,
          description: input.description || null,
          performed_at: input.performed_at || new Date().toISOString(),
          cost_cents: input.cost_cents || null,
          parts_used: input.parts_used || null,
          next_due_date: input.next_due_date || null,
          notes: input.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceLogEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance-log'] });
    },
  });
}

export function useMaintenanceLog(equipmentId: string | null, equipmentType?: string) {
  return useQuery({
    queryKey: ['maintenance-log', equipmentId, equipmentType],
    queryFn: async () => {
      let query = supabase
        .from('maintenance_log')
        .select('*')
        .order('performed_at', { ascending: false });

      if (equipmentId) {
        query = query.eq('equipment_id', equipmentId);
      }
      if (equipmentType) {
        query = query.eq('equipment_type', equipmentType);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as MaintenanceLogEntry[];
    },
    enabled: !!equipmentId || !!equipmentType,
    staleTime: 5 * 60 * 1000,
  });
}
