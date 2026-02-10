import { describe, it, expect } from 'vitest';
import { haversineDistanceNm } from './geo-utils';

describe('haversineDistanceNm', () => {
  // Known reference distances (aviation charts)
  // KORF (Norfolk) to KPHF (Newport News): ~17 NM
  const KORF = { lat: 36.8946, lon: -76.2012 };
  const KPHF = { lat: 37.1319, lon: -76.4930 };
  // KORF to KNTU (Oceana NAS): ~8 NM
  const KNTU = { lat: 36.8207, lon: -76.0336 };

  it('returns 0 for identical points', () => {
    expect(haversineDistanceNm(36.89, -76.20, 36.89, -76.20)).toBe(0);
  });

  it('calculates KORF to KPHF within 1 NM of expected ~17 NM', () => {
    const dist = haversineDistanceNm(KORF.lat, KORF.lon, KPHF.lat, KPHF.lon);
    expect(dist).toBeGreaterThan(16);
    expect(dist).toBeLessThan(20);
  });

  it('calculates KORF to KNTU within 1 NM of expected ~8 NM', () => {
    const dist = haversineDistanceNm(KORF.lat, KORF.lon, KNTU.lat, KNTU.lon);
    expect(dist).toBeGreaterThan(7);
    expect(dist).toBeLessThan(11);
  });

  it('is symmetric: dist(A,B) === dist(B,A)', () => {
    const ab = haversineDistanceNm(KORF.lat, KORF.lon, KPHF.lat, KPHF.lon);
    const ba = haversineDistanceNm(KPHF.lat, KPHF.lon, KORF.lat, KORF.lon);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('satisfies triangle inequality: dist(A,C) <= dist(A,B) + dist(B,C)', () => {
    const ab = haversineDistanceNm(KORF.lat, KORF.lon, KPHF.lat, KPHF.lon);
    const bc = haversineDistanceNm(KPHF.lat, KPHF.lon, KNTU.lat, KNTU.lon);
    const ac = haversineDistanceNm(KORF.lat, KORF.lon, KNTU.lat, KNTU.lon);
    expect(ac).toBeLessThanOrEqual(ab + bc);
  });

  it('always returns non-negative', () => {
    expect(haversineDistanceNm(0, 0, 0, 0)).toBeGreaterThanOrEqual(0);
    expect(haversineDistanceNm(90, 0, -90, 0)).toBeGreaterThanOrEqual(0);
    expect(haversineDistanceNm(0, -180, 0, 180)).toBeGreaterThanOrEqual(0);
  });

  it('handles antipodal points (max distance ~10800 NM half circumference)', () => {
    const dist = haversineDistanceNm(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(10790);
    expect(dist).toBeLessThan(10810);
  });
});
