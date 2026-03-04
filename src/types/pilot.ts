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
    weatherLog: { id: string; determination: string; station: string; briefing_timestamp: string } | null;
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

// Base SOP Checklist items per PRD §5.5.1 (all mission types)
export const SOP_CHECKLIST_ITEMS: Omit<ChecklistItem, 'checked' | 'checked_at'>[] = [
    { key: 'laanc_authorization', label: 'Airspace Authorization Confirmed (LAANC)' },
    { key: 'hazard_scan', label: 'Physical Hazard Scan Completed' },
    { key: 'sd_card', label: 'SD Card Formatted & Empty' },
    { key: 'battery_level', label: 'Battery Level Verified (>80%)' },
    { key: 'weather_conditions', label: 'Weather Conditions Acceptable' },
    { key: 'equipment_preflight', label: 'Equipment Pre-Flight Check Complete' },
];

// Mission-specific checklist extras per SOP docs
const MISSION_CHECKLIST_EXTRAS: Record<string, Omit<ChecklistItem, 'checked' | 'checked_at'>[]> = {
    CONSTRUCTION_450: [
        { key: 'compass_angles', label: 'Compass Angles Match Previous Visit' },
        { key: 'ppe_verified', label: 'PPE Worn (Hard Hat, Hi-Vis)' },
        { key: 'site_manager_briefed', label: 'Site Manager Briefed on Flight Plan' },
    ],
    ROOF_INSPECTION: [
        { key: 'low_altitude_clearance', label: 'Low Altitude Clearance Verified (<150ft)' },
        { key: 'property_owner_confirmed', label: 'Property Owner Confirmed on Site' },
    ],
    LISTING_PRO_450: [
        { key: 'video_settings', label: 'Video Settings Confirmed (4K/30fps)' },
    ],
    LUXURY_750: [
        { key: 'video_settings', label: 'Video Settings Confirmed (4K/30fps)' },
        { key: 'twilight_timing', label: 'Twilight Window Timing Confirmed' },
    ],
    COMMERCIAL_850: [
        { key: 'video_settings', label: 'Video Settings Confirmed (4K/30fps)' },
    ],
    LAND_SURVEY: [
        { key: 'gcps_deployed', label: 'Ground Control Points Deployed & Verified' },
        { key: 'rtk_connected', label: 'RTK Base Station Connected' },
        { key: 'overlap_settings', label: 'Overlap Settings Verified (80/70)' },
        { key: 'flight_plan_loaded', label: 'Automated Flight Plan Loaded' },
    ],
    INSURANCE_DOC: [
        { key: 'raw_capture_mode', label: 'RAW Capture Mode Enabled' },
        { key: 'gps_metadata', label: 'GPS Metadata Embedding Enabled' },
        { key: 'evidence_chain', label: 'Evidence Chain Documentation Started' },
        { key: 'timestamp_synced', label: 'Camera Timestamp Synced to GPS Time' },
    ],
    SOLAR_INSPECTION: [
        { key: 'thermal_calibrated', label: 'Thermal Camera Calibrated' },
        { key: 'array_energized', label: 'Solar Array Confirmed Energized' },
        { key: 'temp_differential', label: 'Ambient Temperature Differential Confirmed (>15C)' },
    ],
};

/**
 * Get checklist items for a specific package code.
 * Returns base 6 items + mission-specific extras. Pure function, works offline.
 */
export function getChecklistItemsForPackage(
    packageCode: string | null
): Omit<ChecklistItem, 'checked' | 'checked_at'>[] {
    const base = [...SOP_CHECKLIST_ITEMS];
    if (!packageCode) return base;

    const extras = MISSION_CHECKLIST_EXTRAS[packageCode] || [];

    return [...base, ...extras];
}

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
