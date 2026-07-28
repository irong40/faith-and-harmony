/**
 * drone_jobs.property_type — the column is NOT NULL DEFAULT 'residential', so
 * every job created without an explicit value (mining, corridor, public safety,
 * wildlife) was silently filed as residential. Downstream that column drives
 * the shot-list service_type resolution (migrations 20260727140303 /
 * 20260727141351), so a wrong value produces a wrong shot list, quietly.
 *
 * Deliberately NOT backed by a CHECK constraint: fn_marketplace_lead_to_mission
 * writes property_type independently, and a CHECK would make that trigger throw
 * inside a marketplace lead insert. Validation lives here, in the form.
 */

export const PROPERTY_TYPES = [
  'residential',
  'commercial',
  'land',
  'wildlife_census',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  land: 'Land / Survey',
  wildlife_census: 'Wildlife Census',
};

export const PROPERTY_TYPE_DESCRIPTIONS: Record<PropertyType, string> = {
  residential: 'Homes and listings — re_basic, re_pro, luxury.',
  commercial: 'Buildings, sites and assets — inspection, construction, 3D scenes.',
  land: 'Acreage and linear work — survey, mining, corridor, forestry, mapping.',
  wildlife_census: 'Thermal wildlife counts.',
};

export const DEFAULT_PROPERTY_TYPE: PropertyType = 'residential';

/**
 * processing_templates.preset_name -> property_type.
 * Presets not listed here fall back to 'residential', which matches the column
 * default, so an unmapped new preset behaves no worse than today.
 */
const PRESET_TO_PROPERTY_TYPE: Readonly<Record<string, PropertyType>> = {
  // land
  survey_civil: 'land',
  mining_volumetrics: 'land',
  corridor_mapping: 'land',
  forestry_chm: 'land',
  mapping: 'land',
  // commercial
  scene_reconstruction: 'commercial',
  thermal_inspection: 'commercial',
  commercial: 'commercial',
  construction: 'commercial',
  // wildlife
  wildlife_census_thermal: 'wildlife_census',
  // residential
  re_basic: 'residential',
  re_pro: 'residential',
  luxury: 'residential',
};

export function isPropertyType(value: unknown): value is PropertyType {
  return typeof value === 'string' && (PROPERTY_TYPES as readonly string[]).includes(value);
}

/** Suggested property_type for a processing template's preset_name. */
export function propertyTypeForPreset(presetName: string | null | undefined): PropertyType {
  if (!presetName) return DEFAULT_PROPERTY_TYPE;
  return PRESET_TO_PROPERTY_TYPE[presetName.trim().toLowerCase()] ?? DEFAULT_PROPERTY_TYPE;
}

/** True when the preset has an explicit mapping (vs. falling back to the default). */
export function hasPropertyTypeMapping(presetName: string | null | undefined): boolean {
  if (!presetName) return false;
  return presetName.trim().toLowerCase() in PRESET_TO_PROPERTY_TYPE;
}
