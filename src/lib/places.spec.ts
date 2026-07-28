import { describe, it, expect } from 'vitest';
import {
  buildPlaceSelection,
  describePlaceSelection,
  extractCity,
  extractState,
  extractZip,
  type PlaceAddressComponent,
} from './places';

const norfolk: PlaceAddressComponent[] = [
  { longText: '1234', shortText: '1234', types: ['street_number'] },
  { longText: 'Main Street', shortText: 'Main St', types: ['route'] },
  { longText: 'Norfolk', shortText: 'Norfolk', types: ['locality', 'political'] },
  {
    longText: 'Virginia',
    shortText: 'VA',
    types: ['administrative_area_level_1', 'political'],
  },
  { longText: 'United States', shortText: 'US', types: ['country', 'political'] },
  { longText: '23510', shortText: '23510', types: ['postal_code'] },
  { longText: '1234', shortText: '1234', types: ['postal_code_suffix'] },
];

describe('extractCity', () => {
  it('prefers locality', () => {
    expect(extractCity(norfolk)).toBe('Norfolk');
  });

  it('falls back to postal_town when there is no locality', () => {
    const components: PlaceAddressComponent[] = [
      { longText: 'Chesapeake', shortText: 'Chesapeake', types: ['postal_town'] },
    ];
    expect(extractCity(components)).toBe('Chesapeake');
  });

  it('falls back to administrative_area_level_3 for unincorporated parcels', () => {
    const components: PlaceAddressComponent[] = [
      { longText: 'Currituck', shortText: 'Currituck', types: ['administrative_area_level_3'] },
      { longText: 'North Carolina', shortText: 'NC', types: ['administrative_area_level_1'] },
    ];
    expect(extractCity(components)).toBe('Currituck');
  });

  it('returns null rather than guessing when nothing matches', () => {
    expect(extractCity([{ longText: 'US', shortText: 'US', types: ['country'] }])).toBeNull();
    expect(extractCity([])).toBeNull();
    expect(extractCity(null)).toBeNull();
    expect(extractCity(undefined)).toBeNull();
  });
});

describe('extractState', () => {
  it('returns the two-letter short code, not the long name', () => {
    expect(extractState(norfolk)).toBe('VA');
  });

  it('falls back to longText when shortText is missing', () => {
    const components: PlaceAddressComponent[] = [
      { longText: 'Virginia', shortText: null, types: ['administrative_area_level_1'] },
    ];
    expect(extractState(components)).toBe('Virginia');
  });

  it('returns null when absent', () => {
    expect(extractState([])).toBeNull();
    expect(extractState(null)).toBeNull();
  });
});

describe('extractZip', () => {
  it('returns the postal_code and ignores the +4 suffix', () => {
    expect(extractZip(norfolk)).toBe('23510');
  });

  it('returns null when absent', () => {
    expect(extractZip([])).toBeNull();
  });
});

describe('buildPlaceSelection', () => {
  it('flattens a full place into the drone_jobs column set', () => {
    const result = buildPlaceSelection({
      formattedAddress: '1234 Main St, Norfolk, VA 23510, USA',
      addressComponents: norfolk,
      location: { lat: 36.8946, lng: -76.2012 },
    });

    expect(result).toEqual({
      address: '1234 Main St, Norfolk, VA 23510, USA',
      latitude: 36.8946,
      longitude: -76.2012,
      city: 'Norfolk',
      state: 'VA',
      zip: '23510',
    });
  });

  it('keeps coordinates null when the place has no geometry', () => {
    const result = buildPlaceSelection({
      formattedAddress: 'Somewhere',
      addressComponents: norfolk,
      location: null,
    });
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
    // The address parts still land, so a partial row is still useful.
    expect(result.city).toBe('Norfolk');
  });

  it('rejects non-finite coordinates', () => {
    const result = buildPlaceSelection({
      formattedAddress: 'Somewhere',
      location: { lat: Number.NaN, lng: Number.POSITIVE_INFINITY },
    });
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });

  it('uses the typed fallback address when Google returns none', () => {
    const result = buildPlaceSelection({
      formattedAddress: null,
      fallbackAddress: '  500 Corporate Blvd  ',
    });
    expect(result.address).toBe('500 Corporate Blvd');
  });

  it('does not invent address parts when components are missing', () => {
    const result = buildPlaceSelection({ formattedAddress: 'Field site, no components' });
    expect(result.city).toBeNull();
    expect(result.state).toBeNull();
    expect(result.zip).toBeNull();
  });
});

describe('describePlaceSelection', () => {
  it('summarises locality and coordinates', () => {
    expect(
      describePlaceSelection({
        address: '1234 Main St',
        latitude: 36.8946,
        longitude: -76.2012,
        city: 'Norfolk',
        state: 'VA',
        zip: '23510',
      }),
    ).toBe('Norfolk, VA 23510 · 36.89460, -76.20120');
  });

  it('omits the coordinate half when there is no geometry', () => {
    expect(
      describePlaceSelection({
        address: '1234 Main St',
        latitude: null,
        longitude: null,
        city: 'Norfolk',
        state: 'VA',
        zip: null,
      }),
    ).toBe('Norfolk, VA');
  });

  it('returns an empty string when there is nothing to report', () => {
    expect(
      describePlaceSelection({
        address: '',
        latitude: null,
        longitude: null,
        city: null,
        state: null,
        zip: null,
      }),
    ).toBe('');
  });
});
