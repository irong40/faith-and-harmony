import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import { isAircraftId } from './useAircraftMaintenance';

// isAircraftId is the only guard before the URL id goes into the PostgREST
// .or() filter string, so anything that is not a bare UUID must be refused.
describe('isAircraftId', () => {
  it('accepts a UUID', () => {
    expect(isAircraftId('00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(isAircraftId('ABCDEF01-2345-6789-ABCD-EF0123456789')).toBe(true);
  });

  it('refuses a filter injection through the URL id', () => {
    expect(isAircraftId('x,aircraft_id.not.is.null')).toBe(false);
    expect(isAircraftId('00000000-0000-4000-8000-000000000001,aircraft_id.not.is.null')).toBe(false);
    expect(isAircraftId('00000000-0000-4000-8000-000000000001)')).toBe(false);
  });

  it('refuses empty, missing and non-UUID ids', () => {
    expect(isAircraftId(undefined)).toBe(false);
    expect(isAircraftId('')).toBe(false);
    expect(isAircraftId('new')).toBe(false);
    expect(isAircraftId(' 00000000-0000-4000-8000-000000000001')).toBe(false);
  });
});
