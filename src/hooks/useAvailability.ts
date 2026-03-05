import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AvailabilitySlot = {
  id: string;
  created_at: string;
  updated_at: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  service_type: string | null;
};

export type BlackoutDate = {
  id: string;
  created_at: string;
  blackout_date: string;
  reason: string;
  created_by: string | null;
};

export type AvailabilityOverride = {
  id: string;
  created_at: string;
  updated_at: string;
  override_date: string;
  is_available: boolean;
  note: string | null;
  service_type: string | null;
};

export function useAvailabilitySlots() {
  return useQuery({
    queryKey: ["availability_slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_slots" as never)
        .select("*")
        .order("day_of_week");
      if (error) throw error;
      return data as unknown as AvailabilitySlot[];
    },
  });
}

export function useBlackoutDates(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["blackout_dates", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blackout_dates" as never)
        .select("*")
        .gte("blackout_date", startDate)
        .lte("blackout_date", endDate)
        .order("blackout_date");
      if (error) throw error;
      return data as unknown as BlackoutDate[];
    },
  });
}

export function useAvailabilityOverrides(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["availability_overrides", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_overrides" as never)
        .select("*")
        .gte("override_date", startDate)
        .lte("override_date", endDate)
        .order("override_date");
      if (error) throw error;
      return data as unknown as AvailabilityOverride[];
    },
  });
}

export function useAddBlackoutDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { blackout_date: string; reason: string }) => {
      const { error } = await supabase
        .from("blackout_dates" as never)
        .insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blackout_dates"] });
      toast.success("Blackout date added");
    },
    onError: (err: Error) => {
      const msg = err.message?.includes("unique")
        ? "That date is already blocked"
        : "Failed to add blackout date";
      toast.error(msg);
    },
  });
}

export function useRemoveBlackoutDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("blackout_dates" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blackout_dates"] });
      toast.success("Blackout removed");
    },
    onError: () => {
      toast.error("Failed to remove blackout date");
    },
  });
}

export function useToggleSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("availability_slots" as never)
        .update({ is_active, updated_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability_slots"] });
      toast.success("Slot updated");
    },
    onError: () => {
      toast.error("Failed to update slot");
    },
  });
}
