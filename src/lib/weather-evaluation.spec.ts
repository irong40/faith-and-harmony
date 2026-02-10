import { describe, it, expect } from 'vitest';
import { evaluateWeather } from './weather-evaluation';
import type { WeatherThreshold } from '@/types/weather';

// Reusable threshold fixtures
const part107: WeatherThreshold = {
  id: 't-107',
  label: 'Part 107',
  aircraft_model: null,
  package_type: null,
  is_part_107_minimum: true,
  max_wind_speed_ms: null,
  min_visibility_sm: 3,
  min_cloud_ceiling_ft: 500,
  min_temp_c: null,
  max_temp_c: null,
  max_precip_probability: null,
  max_kp_index: null,
  notes: null,
  created_at: '',
  updated_at: '',
};

const mini4Pro: WeatherThreshold = {
  id: 't-mini4',
  label: 'DJI Mini 4 Pro',
  aircraft_model: 'DJI Mini 4 Pro',
  package_type: null,
  is_part_107_minimum: false,
  max_wind_speed_ms: 10.7,
  min_visibility_sm: null,
  min_cloud_ceiling_ft: null,
  min_temp_c: 0,
  max_temp_c: 40,
  max_precip_probability: 30,
  max_kp_index: 5,
  notes: null,
  created_at: '',
  updated_at: '',
};

const allThresholds = [part107, mini4Pro];

const calm = {
  wind_speed_ms: 3.0,
  wind_gust_ms: null,
  visibility_sm: 10,
  cloud_ceiling_ft: 3000,
  temperature_c: 22,
  precipitation_probability: 0,
  kp_index: 2,
};

describe('evaluateWeather', () => {
  describe('GO conditions', () => {
    it('returns GO when all metrics are well within limits', () => {
      const result = evaluateWeather(calm, allThresholds);
      expect(result.determination).toBe('GO');
      expect(result.reasons).toEqual(['All conditions within acceptable limits']);
    });

    it('returns GO with all-null metrics (no data to violate)', () => {
      const nullMetrics = {
        wind_speed_ms: null,
        wind_gust_ms: null,
        visibility_sm: null,
        cloud_ceiling_ft: null,
        temperature_c: null,
        precipitation_probability: null,
        kp_index: null,
      };
      const result = evaluateWeather(nullMetrics, allThresholds);
      expect(result.determination).toBe('GO');
    });

    it('returns GO with empty thresholds', () => {
      const result = evaluateWeather(calm, []);
      expect(result.determination).toBe('GO');
    });
  });

  describe('CAUTION conditions', () => {
    it('returns CAUTION when wind approaches max (>80% of 10.7 = 8.56)', () => {
      const result = evaluateWeather(
        { ...calm, wind_speed_ms: 9.0 },
        allThresholds,
      );
      expect(result.determination).toBe('CAUTION');
      expect(result.reasons.some(r => /wind.*approaching/i.test(r))).toBe(true);
    });

    it('returns CAUTION when visibility near Part 107 min (3 SM * 1.25 = 3.75)', () => {
      const result = evaluateWeather(
        { ...calm, visibility_sm: 3.5 },
        allThresholds,
      );
      expect(result.determination).toBe('CAUTION');
      expect(result.reasons.some(r => /visibility.*near/i.test(r))).toBe(true);
    });

    it('returns CAUTION when ceiling near min (500 * 1.25 = 625)', () => {
      const result = evaluateWeather(
        { ...calm, cloud_ceiling_ft: 550 },
        allThresholds,
      );
      expect(result.determination).toBe('CAUTION');
    });

    it('returns CAUTION when temp approaches max (>90% of 40 = 36)', () => {
      const result = evaluateWeather(
        { ...calm, temperature_c: 37 },
        allThresholds,
      );
      expect(result.determination).toBe('CAUTION');
    });

    it('returns CAUTION when gusts exceed wind threshold but below 1.2x', () => {
      const result = evaluateWeather(
        { ...calm, wind_gust_ms: 11.5 }, // > 10.7 but < 10.7*1.2=12.84
        allThresholds,
      );
      expect(result.determination).toBe('CAUTION');
      expect(result.reasons.some(r => /gust/i.test(r))).toBe(true);
    });

    it('returns CAUTION when KP index exceeds max', () => {
      const result = evaluateWeather(
        { ...calm, kp_index: 6 },
        allThresholds,
      );
      expect(result.determination).toBe('CAUTION');
      expect(result.reasons.some(r => /kp/i.test(r))).toBe(true);
    });
  });

  describe('NO_GO conditions', () => {
    it('returns NO_GO when wind exceeds max', () => {
      const result = evaluateWeather(
        { ...calm, wind_speed_ms: 12.0 },
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
      expect(result.reasons.some(r => /wind.*exceeds/i.test(r))).toBe(true);
    });

    it('returns NO_GO when visibility below Part 107 min', () => {
      const result = evaluateWeather(
        { ...calm, visibility_sm: 2.0 },
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
    });

    it('returns NO_GO when ceiling below Part 107 min', () => {
      const result = evaluateWeather(
        { ...calm, cloud_ceiling_ft: 400 },
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
    });

    it('returns NO_GO when temp below aircraft min', () => {
      const result = evaluateWeather(
        { ...calm, temperature_c: -5 },
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
      expect(result.reasons.some(r => /temperature.*below/i.test(r))).toBe(true);
    });

    it('returns NO_GO when temp above aircraft max', () => {
      const result = evaluateWeather(
        { ...calm, temperature_c: 42 },
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
    });

    it('returns NO_GO when precip exceeds max', () => {
      const result = evaluateWeather(
        { ...calm, precipitation_probability: 50 },
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
    });

    it('returns NO_GO when gusts exceed 1.2x wind threshold', () => {
      const result = evaluateWeather(
        { ...calm, wind_gust_ms: 14.0 }, // > 10.7*1.2=12.84
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
    });
  });

  describe('escalation priority', () => {
    it('NO_GO wins over CAUTION when both present', () => {
      const result = evaluateWeather(
        { ...calm, wind_speed_ms: 9.0, visibility_sm: 2.0 },
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
      // Should have both reasons
      expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    });

    it('accumulates all reasons across multiple thresholds', () => {
      const result = evaluateWeather(
        { ...calm, wind_speed_ms: 12.0, temperature_c: -5 },
        allThresholds,
      );
      expect(result.determination).toBe('NO_GO');
      expect(result.reasons.some(r => /wind/i.test(r))).toBe(true);
      expect(result.reasons.some(r => /temperature/i.test(r))).toBe(true);
    });
  });

  describe('boundary values', () => {
    it('exactly at wind max is not NO_GO (uses > not >=)', () => {
      const result = evaluateWeather(
        { ...calm, wind_speed_ms: 10.7 },
        allThresholds,
      );
      expect(result.determination).not.toBe('NO_GO');
    });

    it('exactly at visibility min is not NO_GO (uses < not <=)', () => {
      const result = evaluateWeather(
        { ...calm, visibility_sm: 3.0 },
        allThresholds,
      );
      expect(result.determination).not.toBe('NO_GO');
    });

    it('zero wind speed is GO', () => {
      const result = evaluateWeather(
        { ...calm, wind_speed_ms: 0 },
        allThresholds,
      );
      expect(result.determination).toBe('GO');
    });

    it('zero temperature is GO (within 0-40 range boundary)', () => {
      const result = evaluateWeather(
        { ...calm, temperature_c: 0 },
        allThresholds,
      );
      // 0°C is exactly at min_temp_c=0, uses < so 0 is NOT below — GO
      expect(result.determination).not.toBe('NO_GO');
    });
  });
});
