import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DecisionsList from './DecisionsList';

vi.mock('@/hooks/useGovernance', () => ({
  useGovernanceDecisions: vi.fn(),
}));

// Mock DecisionLoggerDialog to avoid nested dialog complexity
vi.mock('./DecisionLoggerDialog', () => ({
  default: () => <button>Log Decision</button>,
}));

import { useGovernanceDecisions } from '@/hooks/useGovernance';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('DecisionsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeletons', () => {
    (useGovernanceDecisions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(<DecisionsList />, { wrapper });
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state', () => {
    (useGovernanceDecisions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<DecisionsList />, { wrapper });
    expect(screen.getByText(/No decisions logged yet/)).toBeTruthy();
  });

  it('renders error state', () => {
    (useGovernanceDecisions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Permission denied'),
    });

    render(<DecisionsList />, { wrapper });
    expect(screen.getByText(/Permission denied/)).toBeTruthy();
  });

  it('renders decision cards with title, outcome, quarter, and fiscal year', () => {
    (useGovernanceDecisions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1',
          decision_date: '2026-03-10',
          title: 'Purchase Matrice 4E',
          context: 'Need primary mapping platform',
          outcome: 'Approved — order placed with DJI',
          action_items: ['Submit PO', 'Schedule training'],
          participants: ['D. Pierce (Founder/Managing Member)'],
          quarter: 'Q1',
          fiscal_year: 2026,
          created_at: '2026-03-10',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<DecisionsList />, { wrapper });

    expect(screen.getByText('Purchase Matrice 4E')).toBeTruthy();
    // date-fns formats UTC date string — may shift by timezone, so match flexibly
    expect(screen.getByText(/March (9|10), 2026/)).toBeTruthy();
    expect(screen.getByText('Approved — order placed with DJI')).toBeTruthy();
    expect(screen.getByText('Q1')).toBeTruthy();
    // FY2026 badge — FY and year are separate text nodes, and "2026" appears in the date too
    expect(screen.getByText(/FY/)).toBeTruthy();
    expect(screen.getAllByText(/2026/).length).toBeGreaterThanOrEqual(2); // date + badge
  });

  it('renders action items as a bulleted list', () => {
    (useGovernanceDecisions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1',
          decision_date: '2026-03-10',
          title: 'Test',
          context: null,
          outcome: 'Done',
          action_items: ['Submit PO', 'Schedule training'],
          participants: ['D. Pierce (Founder/Managing Member)'],
          quarter: 'Q1',
          fiscal_year: 2026,
          created_at: '2026-03-10',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<DecisionsList />, { wrapper });

    expect(screen.getByText('Submit PO')).toBeTruthy();
    expect(screen.getByText('Schedule training')).toBeTruthy();
    expect(screen.getByText('Action Items')).toBeTruthy();
  });

  it('renders participants as comma-separated text', () => {
    (useGovernanceDecisions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: '1',
          decision_date: '2026-03-10',
          title: 'Test',
          context: null,
          outcome: 'Done',
          action_items: [],
          participants: ['D. Pierce (Founder/Managing Member)', 'Attorney'],
          quarter: 'Q1',
          fiscal_year: 2026,
          created_at: '2026-03-10',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<DecisionsList />, { wrapper });

    expect(screen.getByText(/D\. Pierce.*Attorney/)).toBeTruthy();
  });

  it('includes Log Decision button from dialog component', () => {
    (useGovernanceDecisions as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<DecisionsList />, { wrapper });
    expect(screen.getByText('Log Decision')).toBeTruthy();
  });
});
