// Pilot profile and flight log types for Trestle Pilot Portal

export interface PilotProfile {
    id: string;
    full_name: string | null;
    part_107_number: string | null;
    part_107_expiry: string | null;
}

export type CertificationStatus = 'valid' | 'expiring_soon' | 'expiring_warning' | 'expired';

export interface ChecklistItem {
    key: string;
    label: string;
    checked: boolean;
    checked_at: string | null;
    data_source?: 'manual' | 'system' | null;
}

export interface ChecklistData {
    version: string;
    completed_at: string | null;
    items: Record<string, ChecklistItem>;
    equipment_id?: string | null;
    weather_log_id?: string | null;
    authorization_id?: string | null;
}

export interface PreFlightData {
    equipment: { id: string; aircraft_model: string } | null;
    weatherLog: { id: string; determination: string; station: string } | null;
    authorization: { id: string; airspace_class: string; requires_laanc: boolean } | null;
}

export interface FlightLog {
    id: string;
    mission_id: string;
    pilot_id: string;
    checklist_data: ChecklistData;
    flight_timestamp: string;
    device_id: string | null;
    created_at: string;
}

// SOP Checklist items per PRD §5.5.1
export const SOP_CHECKLIST_ITEMS: Omit<ChecklistItem, 'checked' | 'checked_at'>[] = [
    { key: 'laanc_authorization', label: 'Airspace Authorization Confirmed (LAANC)' },
    { key: 'hazard_scan', label: 'Physical Hazard Scan Completed' },
    { key: 'sd_card', label: 'SD Card Formatted & Empty' },
    { key: 'battery_level', label: 'Battery Level Verified (>80%)' },
    { key: 'weather_conditions', label: 'Weather Conditions Acceptable' },
    { key: 'equipment_preflight', label: 'Equipment Pre-Flight Check Complete' },
];

/**
 * Calculate certification status based on expiry date
 */
export function getCertificationStatus(expiryDate: string | null): CertificationStatus {
    if (!expiryDate) return 'expired';

    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry < 30) return 'expiring_warning';
    if (daysUntilExpiry < 90) return 'expiring_soon';
    return 'valid';
}

/**
 * Get days until Part 107 expiration
 */
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
    if (!expiryDate) return null;

    const expiry = new Date(expiryDate);
    const now = new Date();
    return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
