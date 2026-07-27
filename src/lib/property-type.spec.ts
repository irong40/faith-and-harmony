import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROPERTY_TYPE,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  hasPropertyTypeMapping,
  isPropertyType,
  propertyTypeForPreset,
} from './property-type';

describe('propertyTypeForPreset', () => {
  it.each([
    ['survey_civil', 'land'],
    ['mining_volumetrics', 'land'],
    ['corridor_mapping', 'land'],
    ['forestry_chm', 'land'],
    ['mapping', 'land'],
  ])('maps %s -> land', (preset, expected) => {
    expect(propertyTypeForPreset(preset)).toBe(expected);
  });

  it.each([
    ['scene_reconstruction', 'commercial'],
    ['thermal_inspection', 'commercial'],
    ['commercial', 'commercial'],
    ['construction', 'commercial'],
  ])('maps %s -> commercial', (preset, expected) => {
    expect(propertyTypeForPreset(preset)).toBe(expected);
  });

  it('maps wildlife_census_thermal -> wildlife_census', () => {
    expect(propertyTypeForPreset('wildlife_census_thermal')).toBe('wildlife_census');
  });

  it.each([
    ['re_basic', 'residential'],
    ['re_pro', 'residential'],
    ['luxury', 'residential'],
  ])('maps %s -> residential', (preset, expected) => {
    expect(propertyTypeForPreset(preset)).toBe(expected);
  });

  it('is case- and whitespace-insensitive', () => {
    expect(propertyTypeForPreset('  Mining_Volumetrics ')).toBe('land');
  });

  it('falls back to the column default for unknown, null or empty presets', () => {
    expect(propertyTypeForPreset('some_future_preset')).toBe(DEFAULT_PROPERTY_TYPE);
    expect(propertyTypeForPreset(null)).toBe(DEFAULT_PROPERTY_TYPE);
    expect(propertyTypeForPreset(undefined)).toBe(DEFAULT_PROPERTY_TYPE);
    expect(propertyTypeForPreset('')).toBe(DEFAULT_PROPERTY_TYPE);
  });

  it('never returns a value outside the picker options', () => {
    const presets = [
      'survey_civil',
      'mining_volumetrics',
      'corridor_mapping',
      'forestry_chm',
      'mapping',
      'scene_reconstruction',
      'thermal_inspection',
      'commercial',
      'construction',
      'wildlife_census_thermal',
      're_basic',
      're_pro',
      'luxury',
      'unknown_preset',
    ];
    for (const preset of presets) {
      expect(PROPERTY_TYPES).toContain(propertyTypeForPreset(preset));
    }
  });
});

describe('hasPropertyTypeMapping', () => {
  it('is true for a mapped preset', () => {
    expect(hasPropertyTypeMapping('corridor_mapping')).toBe(true);
  });

  it('is false for an unmapped or missing preset', () => {
    expect(hasPropertyTypeMapping('some_future_preset')).toBe(false);
    expect(hasPropertyTypeMapping(null)).toBe(false);
  });
});

describe('isPropertyType', () => {
  it('accepts every option offered by the picker', () => {
    for (const value of PROPERTY_TYPES) {
      expect(isPropertyType(value)).toBe(true);
    }
  });

  it('rejects anything else', () => {
    expect(isPropertyType('construction_site')).toBe(false);
    expect(isPropertyType(undefined)).toBe(false);
    expect(isPropertyType(3)).toBe(false);
  });
});

describe('PROPERTY_TYPE_LABELS', () => {
  it('has a label for every option', () => {
    for (const value of PROPERTY_TYPES) {
      expect(PROPERTY_TYPE_LABELS[value]).toBeTruthy();
    }
  });
});
