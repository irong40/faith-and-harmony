import { describe, it, expect } from 'vitest';
import { isValidJobPriceInput, jobIntakeSchema, parseJobPrice } from './schemas';

describe('parseJobPrice', () => {
  it('parses plain dollar integers', () => {
    expect(parseJobPrice('450')).toBe(450);
    expect(parseJobPrice('0')).toBe(0);
  });

  it('tolerates the way admins actually type money', () => {
    expect(parseJobPrice('$450')).toBe(450);
    expect(parseJobPrice('1,250')).toBe(1250);
    expect(parseJobPrice(' $1,250 ')).toBe(1250);
  });

  it('returns null for empty, null or undefined', () => {
    expect(parseJobPrice('')).toBeNull();
    expect(parseJobPrice('   ')).toBeNull();
    expect(parseJobPrice(null)).toBeNull();
    expect(parseJobPrice(undefined)).toBeNull();
  });

  it('refuses cents and other non-integers rather than rounding them', () => {
    expect(parseJobPrice('450.50')).toBeNull();
    expect(parseJobPrice('-450')).toBeNull();
    expect(parseJobPrice('abc')).toBeNull();
  });

  it('refuses an implausible price', () => {
    expect(parseJobPrice('99999999')).toBeNull();
  });
});

describe('isValidJobPriceInput', () => {
  it('treats blank as valid (price is optional)', () => {
    expect(isValidJobPriceInput('')).toBe(true);
    expect(isValidJobPriceInput(undefined)).toBe(true);
  });

  it('rejects what parseJobPrice would drop', () => {
    expect(isValidJobPriceInput('450.50')).toBe(false);
    expect(isValidJobPriceInput('abc')).toBe(false);
    expect(isValidJobPriceInput('450')).toBe(true);
  });
});

describe('jobIntakeSchema', () => {
  const base = {
    client_id: '11111111-1111-1111-1111-111111111111',
    processing_template_id: '22222222-2222-2222-2222-222222222222',
    site_address: '1234 Main St, Norfolk, VA 23510',
    scheduled_date: '2026-08-01',
  };

  it('accepts a minimal job and applies the new-field defaults', () => {
    const parsed = jobIntakeSchema.parse(base);
    expect(parsed.property_type).toBe('residential');
    expect(parsed.is_rush).toBe(false);
    expect(parsed.video_addon).toBe(false);
    expect(parsed.vegetation_analysis).toBe(false);
    expect(parsed.latitude).toBeNull();
    expect(parsed.longitude).toBeNull();
  });

  it('accepts the geocoded fields', () => {
    const parsed = jobIntakeSchema.parse({
      ...base,
      latitude: 36.8946,
      longitude: -76.2012,
      property_city: 'Norfolk',
      property_state: 'VA',
      property_zip: '23510',
    });
    expect(parsed.latitude).toBe(36.8946);
    expect(parsed.property_state).toBe('VA');
  });

  it('accepts every property_type the picker offers', () => {
    for (const property_type of ['residential', 'commercial', 'land', 'wildlife_census'] as const) {
      expect(jobIntakeSchema.parse({ ...base, property_type }).property_type).toBe(property_type);
    }
  });

  it('rejects a property_type outside the picker', () => {
    expect(jobIntakeSchema.safeParse({ ...base, property_type: 'construction_site' }).success).toBe(
      false,
    );
  });

  it('rejects a malformed price', () => {
    const result = jobIntakeSchema.safeParse({ ...base, job_price: '450.50' });
    expect(result.success).toBe(false);
  });

  it('still requires a site address', () => {
    expect(jobIntakeSchema.safeParse({ ...base, site_address: '' }).success).toBe(false);
  });
});
