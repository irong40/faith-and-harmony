// Fleet management types for Trestle v2.0

export interface Aircraft {
  id: string;
  model: string;
  serial_number: string;
  nickname: string | null;
  faa_registration: string | null;
  firmware_version: string | null;
  insurance_expiry: string | null;
  purchase_date: string | null;
  status: string;
  total_flights: number;
  total_flight_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Battery {
  id: string;
  serial_number: string;
  model: string | null;
  capacity_mah: number;
  cycle_count: number;
  health_percentage: number;
  aircraft_id: string | null;
  status: string;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Controller {
  id: string;
  model: string;
  serial_number: string;
  firmware_version: string | null;
  paired_aircraft_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AircraftCapability {
  id: string;
  aircraft_id: string;
  package_id: string;
  notes: string | null;
  created_at: string;
}

export interface MissionEquipment {
  id: string;
  mission_id: string;
  aircraft_id: string;
  battery_ids: string[] | null;
  controller_id: string | null;
  accessory_ids: string[] | null;
  notes: string | null;
  created_at: string;
}

export type AccessoryType = 'filter' | 'lens' | 'propeller' | 'case' | 'charger' | 'antenna' | 'mount' | 'other';

export interface Accessory {
  id: string;
  name: string;
  type: AccessoryType;
  serial_number: string | null;
  compatible_aircraft: string[] | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type EquipmentType = 'aircraft' | 'battery' | 'controller' | 'accessory';
export type MaintenanceType =
  | 'scheduled' | 'unscheduled' | 'repair' | 'inspection' | 'firmware_update' | 'calibration'
  | 'service' | 'part_replacement' | 'battery_replacement';

export interface MaintenanceLogEntry {
  id: string;
  equipment_id: string;
  equipment_type: EquipmentType;
  maintenance_type: MaintenanceType;
  description: string | null;
  performed_at: string;
  performed_by: string | null;
  cost_cents: number | null;
  parts_used: string[] | null;
  next_due_date: string | null;
  notes: string | null;
  created_at: string;
  // Aircraft history fields (migration 20261124130000). Optional because rows
  // read before the migration is applied do not carry them; null = unknown.
  aircraft_id?: string | null;
  component_id?: string | null;
  flight_hours_at_service?: number | null;
  results?: string | null;
  performed_by_name?: string | null;
  evidence_url?: string | null;
  open_issues?: string | null;
  next_due_flight_hours?: number | null;
  is_test?: boolean;
}
