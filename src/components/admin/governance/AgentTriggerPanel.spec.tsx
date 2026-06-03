import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AgentTriggerPanel from './AgentTriggerPanel';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('AgentTriggerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders all four agent cards', () => {
    render(<AgentTriggerPanel />);

    expect(screen.getByText('Compliance Sentinel')).toBeTruthy();
    expect(screen.getByText('Financial Analyst')).toBeTruthy();
    expect(screen.getByText('Governance Scribe')).toBeTruthy();
    expect(screen.getByText('Document Drafter')).toBeTruthy();
  });

  it('renders descriptions for each agent', () => {
    render(<AgentTriggerPanel />);

    expect(screen.getByText('Scan obligations and send compliance reminders')).toBeTruthy();
    expect(screen.getByText('Generate monthly financial report')).toBeTruthy();
    expect(screen.getByText('Generate quarterly meeting minutes')).toBeTruthy();
    expect(screen.getByText('Draft a governance document on demand')).toBeTruthy();
  });

  it('shows "Not configured" when env vars are missing', () => {
    render(<AgentTriggerPanel />);

    const notConfigured = screen.getAllByText('Not configured');
    expect(notConfigured.length).toBe(4);
  });

  it('shows error toast when webhook URL is not configured', async () => {
    render(<AgentTriggerPanel />);

    const triggerButtons = screen.getAllByText('Trigger');
    fireEvent.click(triggerButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Webhook URL not configured for Compliance Sentinel');
    });
  });

  it('calls fetch with correct payload when webhook is configured', async () => {
    // Stub the env var
    vi.stubEnv('VITE_N8N_SENTINEL_WEBHOOK', 'https://test.n8n.cloud/webhook/sentinel');
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    render(<AgentTriggerPanel />);

    const triggerButtons = screen.getAllByText('Trigger');
    fireEvent.click(triggerButtons[0]);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test.n8n.cloud/webhook/sentinel',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      expect(toast.success).toHaveBeenCalledWith('Compliance Sentinel triggered successfully');
    });

    vi.unstubAllEnvs();
  });

  it('shows error toast on fetch failure', async () => {
    vi.stubEnv('VITE_N8N_FINANCIAL_WEBHOOK', 'https://test.n8n.cloud/webhook/financial');
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });

    render(<AgentTriggerPanel />);

    const triggerButtons = screen.getAllByText('Trigger');
    fireEvent.click(triggerButtons[1]); // Financial Analyst

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to trigger Financial Analyst');
    });

    vi.unstubAllEnvs();
  });
});
