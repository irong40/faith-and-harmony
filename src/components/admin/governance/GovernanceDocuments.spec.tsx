import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GovernanceDocuments from './GovernanceDocuments';

// Mock supabase storage
const mockList = vi.fn();
const mockCreateSignedUrl = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        list: mockList,
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('GovernanceDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all folders return empty
    mockList.mockResolvedValue({ data: [], error: null });
  });

  it('renders document library heading', async () => {
    render(<GovernanceDocuments />, { wrapper: createWrapper() });
    expect(screen.getByText('Document Library')).toBeTruthy();
  });

  it('renders empty state when no files exist', async () => {
    render(<GovernanceDocuments />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/No governance documents found/)).toBeTruthy();
    });
  });

  it('renders files from storage with agent labels', async () => {
    mockList.mockImplementation(async (prefix: string) => {
      if (prefix === 'financial_analyst') {
        return {
          data: [
            {
              name: 'report-2026-02.docx',
              created_at: '2026-03-01T00:00:00Z',
              metadata: { size: 45000 },
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    render(<GovernanceDocuments />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('report-2026-02.docx')).toBeTruthy();
      expect(screen.getByText('Financial Analyst')).toBeTruthy();
    });
  });

  it('filters files by search input', async () => {
    mockList.mockImplementation(async (prefix: string) => {
      if (prefix === 'financial_analyst') {
        return {
          data: [
            { name: 'report-feb.docx', created_at: '2026-03-01T00:00:00Z', metadata: { size: 100 } },
            { name: 'report-mar.docx', created_at: '2026-04-01T00:00:00Z', metadata: { size: 100 } },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    render(<GovernanceDocuments />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('report-feb.docx')).toBeTruthy();
      expect(screen.getByText('report-mar.docx')).toBeTruthy();
    });

    const searchInput = screen.getByPlaceholderText('Search documents...');
    fireEvent.change(searchInput, { target: { value: 'feb' } });

    expect(screen.getByText('report-feb.docx')).toBeTruthy();
    expect(screen.queryByText('report-mar.docx')).toBeNull();
  });

  it('generates signed URL on download click and opens in new tab', async () => {
    mockList.mockImplementation(async (prefix: string) => {
      if (prefix === 'governance_scribe') {
        return {
          data: [
            { name: 'minutes-Q1.docx', created_at: '2026-04-01T00:00:00Z', metadata: { size: 100 } },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed/minutes-Q1.docx' },
      error: null,
    });

    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<GovernanceDocuments />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('minutes-Q1.docx')).toBeTruthy();
    });

    // Click the download button (the only button in the row)
    const downloadButtons = screen.getAllByRole('button');
    const downloadBtn = downloadButtons.find(btn => btn.closest('td'));
    fireEvent.click(downloadBtn!);

    await waitFor(() => {
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('governance_scribe/minutes-Q1.docx', 300);
      expect(windowOpenSpy).toHaveBeenCalledWith(
        'https://storage.example.com/signed/minutes-Q1.docx',
        '_blank',
      );
    });

    windowOpenSpy.mockRestore();
  });

  it('shows error toast when signed URL generation fails', async () => {
    mockList.mockImplementation(async (prefix: string) => {
      if (prefix === 'document_drafter') {
        return {
          data: [
            { name: 'nda.docx', created_at: '2026-04-01T00:00:00Z', metadata: { size: 100 } },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });

    render(<GovernanceDocuments />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('nda.docx')).toBeTruthy();
    });

    const downloadButtons = screen.getAllByRole('button');
    const downloadBtn = downloadButtons.find(btn => btn.closest('td'));
    fireEvent.click(downloadBtn!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to generate download link');
    });
  });

  it('skips .emptyFolderPlaceholder files', async () => {
    mockList.mockImplementation(async (prefix: string) => {
      if (prefix === 'compliance_sentinel') {
        return {
          data: [
            { name: '.emptyFolderPlaceholder', created_at: '2026-01-01T00:00:00Z', metadata: { size: 0 } },
            { name: 'reminder-log.docx', created_at: '2026-03-01T00:00:00Z', metadata: { size: 100 } },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });

    render(<GovernanceDocuments />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('reminder-log.docx')).toBeTruthy();
      expect(screen.queryByText('.emptyFolderPlaceholder')).toBeNull();
    });
  });
});
