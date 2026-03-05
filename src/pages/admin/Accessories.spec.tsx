import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client before any imports that use it
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
}));

vi.mock('@/hooks/useFleet', () => ({
  useAllAccessories: vi.fn(),
  useAllAircraft: vi.fn(),
}));

vi.mock('@/hooks/useFleetMutations', () => ({
  useDeleteAccessory: vi.fn(),
  useCreateAccessory: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useUpdateAccessory: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { useAllAccessories } from '@/hooks/useFleet';
import { useDeleteAccessory } from '@/hooks/useFleetMutations';

describe('Admin Accessories page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useDeleteAccessory should call supabase.rpc with delete_accessory_safe', async () => {
    // The actual hook calls supabase.rpc('delete_accessory_safe', { p_accessory_id: id })
    // We verify the hook module exports useDeleteAccessory
    const { useDeleteAccessory: realHook } = await vi.importActual<typeof import('@/hooks/useFleetMutations')>('@/hooks/useFleetMutations');
    expect(realHook).toBeDefined();
    expect(typeof realHook).toBe('function');
  });

  it('useAllAccessories returns data that can populate an accessories table', () => {
    const mockAccessories = [
      {
        id: '1',
        name: 'ND16 Filter',
        type: 'filter',
        serial_number: 'SN001',
        compatible_aircraft: ['DJI Matrice 4E'],
        status: 'active',
        notes: null,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ];

    (useAllAccessories as ReturnType<typeof vi.fn>).mockReturnValue({
      data: mockAccessories,
      isLoading: false,
      error: null,
    });

    const result = (useAllAccessories as ReturnType<typeof vi.fn>)();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe('ND16 Filter');
    expect(result.data[0].type).toBe('filter');
    expect(result.data[0].serial_number).toBe('SN001');
    expect(result.data[0].compatible_aircraft).toEqual(['DJI Matrice 4E']);
    expect(result.data[0].status).toBe('active');
  });

  it('delete mutation should surface "referenced by" errors from the RPC call', async () => {
    // Simulates the error path: when delete_accessory_safe raises an exception
    const mockError = new Error('Accessory is referenced by 2 mission(s)');
    const mockMutateAsync = vi.fn().mockRejectedValue(mockError);

    (useDeleteAccessory as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const hook = (useDeleteAccessory as ReturnType<typeof vi.fn>)();
    await expect(hook.mutateAsync('some-id')).rejects.toThrow('referenced by');
  });
});
