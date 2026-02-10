import { describe, it, expect } from 'vitest';
import { parseOrNull, extractCeiling } from './metar-utils';

describe('parseOrNull', () => {
  it('returns number for valid numeric strings', () => {
    expect(parseOrNull('10.5')).toBe(10.5);
    expect(parseOrNull('3')).toBe(3);
    expect(parseOrNull('-7.2')).toBe(-7.2);
  });

  it('returns 0 for "0" (not null)', () => {
    expect(parseOrNull('0')).toBe(0);
    expect(parseOrNull('0.0')).toBe(0);
  });

  it('returns null for empty string', () => {
    expect(parseOrNull('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(parseOrNull('   ')).toBeNull();
    expect(parseOrNull('\t')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parseOrNull('abc')).toBeNull();
    expect(parseOrNull('NaN')).toBeNull();
  });

  it('parses leading-number strings (parseFloat behavior)', () => {
    // parseFloat("12abc") returns 12 — this is expected behavior
    expect(parseOrNull('12abc')).toBe(12);
  });
});

describe('extractCeiling', () => {
  it('returns null for missing clouds array', () => {
    expect(extractCeiling({})).toBeNull();
  });

  it('returns null for empty clouds array', () => {
    expect(extractCeiling({ clouds: [] })).toBeNull();
  });

  it('returns null when only FEW/SCT layers (no ceiling)', () => {
    expect(extractCeiling({
      clouds: [
        { cover: 'FEW', base: 2500 },
        { cover: 'SCT', base: 5000 },
      ],
    })).toBeNull();
  });

  it('returns BKN layer base as ceiling', () => {
    expect(extractCeiling({
      clouds: [
        { cover: 'FEW', base: 2500 },
        { cover: 'BKN', base: 4000 },
      ],
    })).toBe(4000);
  });

  it('returns OVC layer base as ceiling', () => {
    expect(extractCeiling({
      clouds: [
        { cover: 'OVC', base: 1200 },
      ],
    })).toBe(1200);
  });

  it('returns the FIRST BKN/OVC layer (lowest ceiling)', () => {
    expect(extractCeiling({
      clouds: [
        { cover: 'FEW', base: 1000 },
        { cover: 'BKN', base: 2000 },
        { cover: 'OVC', base: 5000 },
      ],
    })).toBe(2000);
  });

  it('returns null when BKN layer has no base field', () => {
    expect(extractCeiling({
      clouds: [{ cover: 'BKN' }],
    })).toBeNull();
  });

  it('handles CLR/SKC (clear skies — no clouds)', () => {
    expect(extractCeiling({
      clouds: [{ cover: 'CLR' }],
    })).toBeNull();
  });
});
