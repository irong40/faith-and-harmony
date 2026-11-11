import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MissionCard from './MissionCard';

function renderCard(status: string) {
  return render(
    <MemoryRouter>
      <MissionCard
        mission={{
          id: 'job-1',
          client_name: 'Test Client',
          address: '1 Main St',
          scheduled_date: null,
          status,
        }}
      />
    </MemoryRouter>,
  );
}

describe('MissionCard status badge', () => {
  it('renders photos_delivered without throwing', () => {
    expect(() => renderCard('photos_delivered')).not.toThrow();
    expect(screen.getByText('PHOTOS DELIVERED')).toBeTruthy();
  });

  it('renders an unknown status with the neutral fallback, not SCHEDULED', () => {
    expect(() => renderCard('awaiting_permit')).not.toThrow();
    expect(screen.getByText('AWAITING PERMIT')).toBeTruthy();
    expect(screen.queryByText('SCHEDULED')).toBeNull();
  });
});
