/**
 * Pure helpers for turning a Google Places result into the flat set of columns
 * `drone_jobs` actually stores.
 *
 * Kept free of any `google.*` runtime dependency on purpose: the extraction
 * rules are the part worth testing, and they must be testable in jsdom without
 * a Maps API key.
 *
 * Column targets (all pre-existing on drone_jobs — no migration):
 *   site_address / property_address, latitude, longitude,
 *   property_city, property_state, property_zip
 *
 * latitude/longitude are what `nearest_weather_station`, the weather_hold
 * automation and the airspace checks read. An address with no coordinates is
 * invisible to all three, so a null pair is always reported honestly rather
 * than guessed at.
 */

/** Shape of `google.maps.places.AddressComponent` (Places API "new"). */
export interface PlaceAddressComponent {
  longText: string | null;
  shortText: string | null;
  types: string[];
}

export interface PlaceSelection {
  /** Formatted address, suitable for site_address / property_address. */
  address: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

export const EMPTY_PLACE_SELECTION: Omit<PlaceSelection, 'address'> = {
  latitude: null,
  longitude: null,
  city: null,
  state: null,
  zip: null,
};

/**
 * City is not a single Google type. Ordered by how well each stands in for
 * "the town this site is in" — `locality` is the common case, `postal_town`
 * covers UK-style results, the sublocality/AAL3 tail catches unincorporated
 * areas that show up in rural VA/NC parcels.
 */
const CITY_TYPES = [
  'locality',
  'postal_town',
  'sublocality_level_1',
  'sublocality',
  'administrative_area_level_3',
] as const;

function findComponent(
  components: readonly PlaceAddressComponent[],
  type: string,
): PlaceAddressComponent | undefined {
  return components.find((c) => Array.isArray(c.types) && c.types.includes(type));
}

function text(
  component: PlaceAddressComponent | undefined,
  prefer: 'long' | 'short',
): string | null {
  if (!component) return null;
  const primary = prefer === 'short' ? component.shortText : component.longText;
  const secondary = prefer === 'short' ? component.longText : component.shortText;
  const value = (primary ?? secondary ?? '').trim();
  return value === '' ? null : value;
}

/** Best-effort city name. Returns null rather than inventing one. */
export function extractCity(
  components: readonly PlaceAddressComponent[] | null | undefined,
): string | null {
  if (!components?.length) return null;
  for (const type of CITY_TYPES) {
    const value = text(findComponent(components, type), 'long');
    if (value) return value;
  }
  return null;
}

/** Two-letter state/province code (shortText), e.g. "VA". */
export function extractState(
  components: readonly PlaceAddressComponent[] | null | undefined,
): string | null {
  if (!components?.length) return null;
  return text(findComponent(components, 'administrative_area_level_1'), 'short');
}

/** Postal code. The +4 suffix is a separate component and is ignored. */
export function extractZip(
  components: readonly PlaceAddressComponent[] | null | undefined,
): string | null {
  if (!components?.length) return null;
  return text(findComponent(components, 'postal_code'), 'long');
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Fold a fetched Place into the flat column set. Any missing piece stays null —
 * a partial write is fine, a wrong one is not.
 */
export function buildPlaceSelection(input: {
  formattedAddress?: string | null;
  addressComponents?: readonly PlaceAddressComponent[] | null;
  location?: { lat: number; lng: number } | null;
  /** Used when Google returns no formattedAddress (rare, but it happens). */
  fallbackAddress?: string;
}): PlaceSelection {
  const components = input.addressComponents ?? null;
  const address = (input.formattedAddress ?? '').trim() || (input.fallbackAddress ?? '').trim();

  return {
    address,
    latitude: finiteOrNull(input.location?.lat),
    longitude: finiteOrNull(input.location?.lng),
    city: extractCity(components),
    state: extractState(components),
    zip: extractZip(components),
  };
}

/** Short human summary of what got geocoded, for the confirmation line. */
export function describePlaceSelection(selection: PlaceSelection): string {
  const locality = [selection.city, selection.state].filter(Boolean).join(', ');
  const place = [locality, selection.zip].filter(Boolean).join(' ');
  const coords =
    selection.latitude !== null && selection.longitude !== null
      ? `${selection.latitude.toFixed(5)}, ${selection.longitude.toFixed(5)}`
      : null;
  return [place || null, coords].filter(Boolean).join(' · ');
}
