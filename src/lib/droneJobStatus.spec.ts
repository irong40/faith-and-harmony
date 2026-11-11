import { describe, it, expect } from 'vitest';
import { Constants } from '@/integrations/supabase/types';
import { DRONE_JOB_STATUS_BADGES, getStatusBadge } from './droneJobStatus';

const ENUM_VALUES: readonly string[] = Constants.public.Enums.drone_job_status;

describe('drone job status map', () => {
  it('has an entry for every drone_job_status enum value', () => {
    expect(ENUM_VALUES.length).toBe(18);
    for (const value of ENUM_VALUES) {
      expect(DRONE_JOB_STATUS_BADGES, value).toHaveProperty(value);
    }
    expect(Object.keys(DRONE_JOB_STATUS_BADGES).sort()).toEqual([...ENUM_VALUES].sort());
  });

  it('labels photos_delivered as PHOTOS DELIVERED', () => {
    expect(getStatusBadge('photos_delivered').label).toBe('PHOTOS DELIVERED');
  });

  it('gives an unknown value a neutral badge labelled from its own text, never SCHEDULED', () => {
    const badge = getStatusBadge('awaiting_permit');
    expect(badge.label).toBe('AWAITING PERMIT');
    expect(badge.color).toBe('bg-slate-400');
    expect(badge.label).not.toBe('SCHEDULED');
  });

  it('gives null, undefined and empty a neutral UNKNOWN badge', () => {
    for (const value of [null, undefined, '', '  ']) {
      expect(getStatusBadge(value)).toMatchObject({ label: 'UNKNOWN', color: 'bg-slate-400' });
    }
  });

  it('does not treat Object prototype keys as statuses', () => {
    expect(getStatusBadge('constructor').label).toBe('CONSTRUCTOR');
    expect(getStatusBadge('toString').color).toBe('bg-slate-400');
  });
});
