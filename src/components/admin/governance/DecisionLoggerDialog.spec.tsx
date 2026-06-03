import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DecisionLoggerDialog from './DecisionLoggerDialog';

// Mock supabase
const mockInsert = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('DecisionLoggerDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it('renders trigger button with "Log Decision" text', () => {
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });
    expect(screen.getByText('Log Decision')).toBeTruthy();
  });

  it('opens dialog when trigger button is clicked', async () => {
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Log Decision'));

    await waitFor(() => {
      expect(screen.getByText('Log Governance Decision')).toBeTruthy();
      expect(screen.getByLabelText('Title')).toBeTruthy();
      expect(screen.getByLabelText('Outcome')).toBeTruthy();
    });
  });

  it('pre-fills decision_date with today and participants with D. Pierce', async () => {
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Log Decision'));

    await waitFor(() => {
      const dateInput = screen.getByLabelText('Decision Date') as HTMLInputElement;
      expect(dateInput.value).toBe(new Date().toISOString().split('T')[0]);

      const participantsInput = screen.getByLabelText('Participants (one per line)') as HTMLTextAreaElement;
      expect(participantsInput.value).toBe('D. Pierce (Founder/Managing Member)');
    });
  });

  it('shows validation errors when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Log Decision'));

    await waitFor(() => {
      expect(screen.getByText('Save Decision')).toBeTruthy();
    });

    // Clear the title field and submit
    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);

    const outcomeInput = screen.getByLabelText('Outcome');
    await user.clear(outcomeInput);

    fireEvent.click(screen.getByText('Save Decision'));

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeTruthy();
      expect(screen.getByText('Outcome is required')).toBeTruthy();
    });
  });

  it('computes quarter correctly from decision_date', async () => {
    const user = userEvent.setup();
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Log Decision'));

    await waitFor(() => screen.getByLabelText('Title'));

    const titleInput = screen.getByLabelText('Title');
    const outcomeInput = screen.getByLabelText('Outcome');
    const dateInput = screen.getByLabelText('Decision Date');

    await user.clear(dateInput);
    await user.type(dateInput, '2026-07-15');
    await user.type(titleInput, 'Q3 Test Decision');
    await user.type(outcomeInput, 'Approved');

    fireEvent.click(screen.getByText('Save Decision'));

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('governance_decisions');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          quarter: 'Q3',
          fiscal_year: 2026,
          title: 'Q3 Test Decision',
          outcome: 'Approved',
        }),
      );
    });
  });

  it('parses action_items from newline-separated text into array', async () => {
    const user = userEvent.setup();
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Log Decision'));
    await waitFor(() => screen.getByLabelText('Title'));

    await user.type(screen.getByLabelText('Title'), 'Test');
    await user.type(screen.getByLabelText('Outcome'), 'Done');
    await user.type(screen.getByLabelText('Action Items (one per line)'), 'Buy equipment\nFile paperwork');

    fireEvent.click(screen.getByText('Save Decision'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action_items: ['Buy equipment', 'File paperwork'],
        }),
      );
    });
  });

  it('defaults participants to D. Pierce when textarea is cleared', async () => {
    const user = userEvent.setup();
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Log Decision'));
    await waitFor(() => screen.getByLabelText('Title'));

    await user.type(screen.getByLabelText('Title'), 'Test');
    await user.type(screen.getByLabelText('Outcome'), 'Done');

    const participantsInput = screen.getByLabelText('Participants (one per line)');
    await user.clear(participantsInput);

    fireEvent.click(screen.getByText('Save Decision'));

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          participants: ['D. Pierce (Founder/Managing Member)'],
        }),
      );
    });
  });

  it('shows success toast and closes dialog on successful insert', async () => {
    const user = userEvent.setup();
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Log Decision'));
    await waitFor(() => screen.getByLabelText('Title'));

    await user.type(screen.getByLabelText('Title'), 'Test Decision');
    await user.type(screen.getByLabelText('Outcome'), 'Approved');

    fireEvent.click(screen.getByText('Save Decision'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Decision logged');
    });
  });

  it('shows error toast on insert failure', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'RLS violation' } });

    const user = userEvent.setup();
    render(<DecisionLoggerDialog />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByText('Log Decision'));
    await waitFor(() => screen.getByLabelText('Title'));

    await user.type(screen.getByLabelText('Title'), 'Test');
    await user.type(screen.getByLabelText('Outcome'), 'Done');

    fireEvent.click(screen.getByText('Save Decision'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to log decision');
    });
  });
});
