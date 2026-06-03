import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ComplianceDashboard from './ComplianceDashboard';

// Mock the hook
vi.mock('@/hooks/useGovernance', () => ({
  useComplianceObligations: vi.fn(),
}));

import { useComplianceObligations } from '@/hooks/useGovernance';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('ComplianceDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons when data is loading', () => {
    (useComplianceObligations as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(<ComplianceDashboard />, { wrapper });
    // shadcn Skeleton renders with animate-pulse class
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when no obligations exist', () => {
    (useComplianceObligations as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<ComplianceDashboard />, { wrapper });
    expect(screen.getByText('No compliance obligations found.')).toBeTruthy();
  });

  it('renders error message on fetch failure', () => {
    (useComplianceObligations as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });

    render(<ComplianceDashboard />, { wrapper });
    expect(screen.getByText(/Network error/)).toBeTruthy();
  });

  it('renders obligations table with correct status badges', () => {
    (useComplianceObligations as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1',
          obligation_name: 'FAA Part 107 renewal',
          category: 'regulatory',
          due_date: '2028-01-01',
          status: 'pending',
          owner: 'founder',
          description: null,
          recurrence: 'biennial',
          source_document: null,
          notes: null,
          completed_at: null,
          created_at: '2026-03-12',
          updated_at: '2026-03-12',
        },
        {
          id: '2',
          obligation_name: 'Liability insurance renewal',
          category: 'insurance',
          due_date: '2027-01-01',
          status: 'complete',
          owner: 'founder',
          description: null,
          recurrence: 'annual',
          source_document: null,
          notes: null,
          completed_at: '2026-03-01',
          created_at: '2026-03-12',
          updated_at: '2026-03-12',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<ComplianceDashboard />, { wrapper });

    // Verify table rows
    expect(screen.getByText('FAA Part 107 renewal')).toBeTruthy();
    expect(screen.getByText('Liability insurance renewal')).toBeTruthy();

    // Verify status badges
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(screen.getByText('Complete')).toBeTruthy();

    // Verify categories
    expect(screen.getByText('regulatory')).toBeTruthy();
    expect(screen.getByText('insurance')).toBeTruthy();

    // Verify summary line
    expect(screen.getByText(/1 pending/)).toBeTruthy();
    expect(screen.getByText(/1 complete/)).toBeTruthy();
  });
});
