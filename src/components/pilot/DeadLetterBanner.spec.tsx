import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeadLetterBanner } from './DeadLetterBanner';

describe('DeadLetterBanner', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <DeadLetterBanner count={0} onRetry={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders warning with correct count when count > 0', () => {
    render(<DeadLetterBanner count={3} onRetry={vi.fn()} />);
    expect(screen.getByText(/3 items failed to sync/)).toBeTruthy();
  });

  it('shows singular "1 item" when count is 1', () => {
    render(<DeadLetterBanner count={1} onRetry={vi.fn()} />);
    expect(screen.getByText(/1 item failed to sync/)).toBeTruthy();
  });

  it('Retry All button calls onRetry callback when clicked', () => {
    const onRetry = vi.fn();
    render(<DeadLetterBanner count={2} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry all/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('uses destructive alert variant', () => {
    render(<DeadLetterBanner count={1} onRetry={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('destructive');
  });
});
