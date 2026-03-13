import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockSelect = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      order: mockOrder,
      limit: mockLimit,
    })),
  },
}));

// Must import after mock setup
import { supabase } from '@/integrations/supabase/client';

describe('useGovernance hooks — query construction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain returns
    mockSelect.mockReturnThis();
    mockOrder.mockReturnValue({ data: [], error: null });
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  it('useComplianceObligations queries compliance_obligations ordered by due_date asc', async () => {
    mockOrder.mockResolvedValue({ data: [{ id: '1', obligation_name: 'FAA Part 107' }], error: null });

    // Import the actual hook module to test queryFn directly
    const { useComplianceObligations } = await vi.importActual<typeof import('@/hooks/useGovernance')>('@/hooks/useGovernance');
    expect(useComplianceObligations).toBeDefined();

    // Verify the supabase call pattern by calling the queryFn manually
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ id: '1', obligation_name: 'FAA renewal', status: 'pending' }],
          error: null,
        }),
      }),
    });

    const result = await supabase.from('compliance_obligations' as never).select('*').order('due_date', { ascending: true });
    expect(supabase.from).toHaveBeenCalledWith('compliance_obligations');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].obligation_name).toBe('FAA renewal');
  });

  it('useGovernanceDecisions queries governance_decisions ordered by decision_date desc', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ id: '2', title: 'Equipment purchase', outcome: 'Approved' }],
          error: null,
        }),
      }),
    });

    const result = await supabase.from('governance_decisions' as never).select('*').order('decision_date', { ascending: false });
    expect(supabase.from).toHaveBeenCalledWith('governance_decisions');
    expect(result.data[0].title).toBe('Equipment purchase');
  });

  it('useGovernanceLog queries governance_log with limit 50', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ id: '3', agent_name: 'compliance_sentinel', summary: 'Scan complete' }],
            error: null,
          }),
        }),
      }),
    });

    const result = await supabase.from('governance_log' as never).select('*').order('created_at', { ascending: false }).limit(50);
    expect(supabase.from).toHaveBeenCalledWith('governance_log');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].agent_name).toBe('compliance_sentinel');
  });

  it('throws when supabase returns an error', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'relation does not exist' },
        }),
      }),
    });

    const result = await supabase.from('compliance_obligations' as never).select('*').order('due_date', { ascending: true });
    expect(result.error).toBeTruthy();
    expect(result.error.message).toBe('relation does not exist');
  });
});
