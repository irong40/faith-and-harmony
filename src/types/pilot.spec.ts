import { describe, it, expect } from 'vitest';
import { getChecklistItemsForPackage, SOP_CHECKLIST_ITEMS } from './pilot';

const BASE_KEYS = SOP_CHECKLIST_ITEMS.map(i => i.key);
const BASE_COUNT = SOP_CHECKLIST_ITEMS.length; // 6

describe('getChecklistItemsForPackage', () => {
  it('returns base 6 items when packageCode is null', () => {
    const items = getChecklistItemsForPackage(null);
    expect(items).toHaveLength(BASE_COUNT);
    expect(items.map(i => i.key)).toEqual(BASE_KEYS);
  });

  it('returns base 6 items for unknown package code', () => {
    const items = getChecklistItemsForPackage('NONEXISTENT_PKG');
    expect(items).toHaveLength(BASE_COUNT);
  });

  it('returns base + 3 extras for CONSTRUCTION_450', () => {
    const items = getChecklistItemsForPackage('CONSTRUCTION_450');
    expect(items.length).toBe(BASE_COUNT + 3);
    const keys = items.map(i => i.key);
    expect(keys).toContain('compass_angles');
    expect(keys).toContain('ppe_verified');
    expect(keys).toContain('site_manager_briefed');
  });

  it('returns base + 2 extras for ROOF_INSPECTION', () => {
    const items = getChecklistItemsForPackage('ROOF_INSPECTION');
    expect(items.length).toBe(BASE_COUNT + 2);
    const keys = items.map(i => i.key);
    expect(keys).toContain('low_altitude_clearance');
    expect(keys).toContain('property_owner_confirmed');
  });

  it('returns base + 4 extras for LAND_SURVEY', () => {
    const items = getChecklistItemsForPackage('LAND_SURVEY');
    expect(items.length).toBe(BASE_COUNT + 4);
    const keys = items.map(i => i.key);
    expect(keys).toContain('gcps_deployed');
    expect(keys).toContain('rtk_connected');
    expect(keys).toContain('overlap_settings');
    expect(keys).toContain('flight_plan_loaded');
  });

  it('returns base + 4 extras for INSURANCE_DOC', () => {
    const items = getChecklistItemsForPackage('INSURANCE_DOC');
    expect(items.length).toBe(BASE_COUNT + 4);
    const keys = items.map(i => i.key);
    expect(keys).toContain('raw_capture_mode');
    expect(keys).toContain('gps_metadata');
    expect(keys).toContain('evidence_chain');
    expect(keys).toContain('timestamp_synced');
  });

  it('returns base + 3 extras for SOLAR_INSPECTION', () => {
    const items = getChecklistItemsForPackage('SOLAR_INSPECTION');
    expect(items.length).toBe(BASE_COUNT + 3);
    const keys = items.map(i => i.key);
    expect(keys).toContain('thermal_calibrated');
    expect(keys).toContain('array_energized');
    expect(keys).toContain('temp_differential');
  });

  it('returns base + 1 extra for LISTING_PRO_450 (video)', () => {
    const items = getChecklistItemsForPackage('LISTING_PRO_450');
    expect(items.length).toBe(BASE_COUNT + 1);
    expect(items.map(i => i.key)).toContain('video_settings');
  });

  it('returns base + 2 extras for LUXURY_750 (video + twilight)', () => {
    const items = getChecklistItemsForPackage('LUXURY_750');
    expect(items.length).toBe(BASE_COUNT + 2);
    const keys = items.map(i => i.key);
    expect(keys).toContain('video_settings');
    expect(keys).toContain('twilight_timing');
  });

  it('always starts with the 6 base items in order', () => {
    const packages = [
      'CONSTRUCTION_450', 'ROOF_INSPECTION', 'LAND_SURVEY',
      'INSURANCE_DOC', 'SOLAR_INSPECTION', 'LUXURY_750',
    ];
    for (const code of packages) {
      const items = getChecklistItemsForPackage(code);
      const firstSix = items.slice(0, BASE_COUNT).map(i => i.key);
      expect(firstSix).toEqual(BASE_KEYS);
    }
  });

  it('has no duplicate keys in any package', () => {
    const packages = [
      null, 'CONSTRUCTION_450', 'ROOF_INSPECTION', 'LISTING_PRO_450',
      'LUXURY_750', 'COMMERCIAL_850', 'LAND_SURVEY', 'INSURANCE_DOC',
      'SOLAR_INSPECTION',
    ];
    for (const code of packages) {
      const items = getChecklistItemsForPackage(code);
      const keys = items.map(i => i.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('does not mutate the base SOP_CHECKLIST_ITEMS array', () => {
    const before = [...SOP_CHECKLIST_ITEMS];
    getChecklistItemsForPackage('CONSTRUCTION_450');
    getChecklistItemsForPackage('SOLAR_INSPECTION');
    expect(SOP_CHECKLIST_ITEMS).toEqual(before);
  });
});
