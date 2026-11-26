import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const calls: { table: string; method: string; args: unknown[] }[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      const chain: Record<string, unknown> = {};
      const rec = (method: string) => (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
      for (const m of ['select', 'eq', 'or', 'order']) chain[m] = rec(m);
      chain.limit = vi.fn(async () => ({ data: [], error: null }));
      return chain;
    }),
  },
}));

import { useFleetMaintenanceLog } from './useFlightHours';
import { useAircraftMaintenanceHistory } from './useAircraftMaintenance';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
);

const orders = () => calls.filter((c) => c.table === 'maintenance_log' && c.method === 'order').map((c) => c.args);

// Same-day entries tie on performed_at (the form stamps 12:00Z), so both
// queries break the tie on created_at, newest first.
describe('maintenance_log queries break same-day ties on created_at', () => {
  it('useFleetMaintenanceLog', async () => {
    calls.length = 0;
    const { result } = renderHook(() => useFleetMaintenanceLog(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orders()).toEqual([
      ['performed_at', { ascending: false }],
      ['created_at', { ascending: false }],
    ]);
  });

  it('useAircraftMaintenanceHistory', async () => {
    calls.length = 0;
    const { result } = renderHook(() => useAircraftMaintenanceHistory('00000000-0000-4000-8000-000000000001'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orders()).toEqual([
      ['performed_at', { ascending: false }],
      ['created_at', { ascending: false }],
    ]);
  });
});
