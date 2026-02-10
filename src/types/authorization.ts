// Airspace authorization types for Trestle v2.0

export type TfrStatus = 'active' | 'scheduled' | 'expired' | 'cancelled';

export interface AirspaceGrid {
  id: string;
  grid_id: string;
  facility_id: string | null;
  facility_name: string | null;
  airspace_class: string;
  ceiling_ft: number;
  laanc_eligible: boolean;
  zero_grid: boolean;
  latitude: number | null;
  longitude: number | null;
  effective_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TfrCache {
  id: string;
  notam_number: string;
  tfr_type: string | null;
  description: string | null;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_nm: number | null;
  floor_ft: number | null;
  ceiling_ft: number | null;
  effective_start: string | null;
  effective_end: string | null;
  status: TfrStatus;
  fetched_at: string;
  raw_data: unknown;
  created_at: string;
  updated_at: string;
}

export interface MissionAuthorization {
  id: string;
  mission_id: string;
  airspace_class: string | null;
  requires_laanc: boolean;
  is_zero_grid: boolean;
  max_approved_altitude_ft: number | null;
  active_tfrs: TfrSummary[] | null;
  determination_notes: string | null;
  requirements_checklist: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
}

export interface TfrSummary {
  notam_number: string;
  description: string | null;
  distance_nm: number;
  status: TfrStatus;
}
