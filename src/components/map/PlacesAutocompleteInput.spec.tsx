import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// No APIProvider is mounted in jsdom, which is exactly the shape of the
// "VITE_GOOGLE_MAPS_API_KEY is absent" production path: GoogleMapsProvider
// renders its children bare, so useMapsLibrary resolves to null.
const mockUseMapsLibrary = vi.fn<() => unknown>(() => null);

vi.mock('@vis.gl/react-google-maps', () => ({
  useMapsLibrary: () => mockUseMapsLibrary(),
}));

import PlacesAutocompleteInput from './PlacesAutocompleteInput';

describe('PlacesAutocompleteInput — free-text fallback', () => {
  beforeEach(() => {
    mockUseMapsLibrary.mockReset();
    mockUseMapsLibrary.mockReturnValue(null);
  });

  it('renders a usable text input when the Places library is unavailable', () => {
    render(
      <PlacesAutocompleteInput
        value=""
        onChange={vi.fn()}
        placeholder="Start typing an address"
      />,
    );

    const input = screen.getByPlaceholderText('Start typing an address');
    expect(input).toBeTruthy();
    expect(input.getAttribute('disabled')).toBeNull();
  });

  it('does not advertise a combobox it cannot service', () => {
    render(<PlacesAutocompleteInput value="" onChange={vi.fn()} placeholder="Address" />);

    // No role=combobox, no aria-expanded: a screen reader is never told to
    // expect suggestions that will never arrive.
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByPlaceholderText('Address').getAttribute('aria-expanded')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('still reports every keystroke so the form can save free text', () => {
    const onChange = vi.fn();
    render(<PlacesAutocompleteInput value="" onChange={onChange} placeholder="Address" />);

    fireEvent.change(screen.getByPlaceholderText('Address'), {
      target: { value: '1234 Main St, Norfolk, VA' },
    });

    expect(onChange).toHaveBeenCalledWith('1234 Main St, Norfolk, VA');
  });

  it('renders the controlled value', () => {
    render(
      <PlacesAutocompleteInput value="500 Corporate Blvd" onChange={vi.fn()} placeholder="Address" />,
    );
    expect((screen.getByPlaceholderText('Address') as HTMLInputElement).value).toBe(
      '500 Corporate Blvd',
    );
  });

  it('honours disabled', () => {
    render(
      <PlacesAutocompleteInput value="" onChange={vi.fn()} placeholder="Address" disabled />,
    );
    expect((screen.getByPlaceholderText('Address') as HTMLInputElement).disabled).toBe(true);
  });
});

describe('PlacesAutocompleteInput — Places library present', () => {
  beforeEach(() => {
    mockUseMapsLibrary.mockReset();
  });

  it('exposes the ARIA combobox contract once autocomplete is available', () => {
    mockUseMapsLibrary.mockReturnValue({
      AutocompleteSessionToken: class {},
      AutocompleteSuggestion: {
        fetchAutocompleteSuggestions: vi.fn().mockResolvedValue({ suggestions: [] }),
      },
    });

    render(<PlacesAutocompleteInput value="" onChange={vi.fn()} placeholder="Address" />);

    const input = screen.getByRole('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-controls')).toBeTruthy();
    // Autofill must stay out of the way of the suggestion list.
    expect(input.getAttribute('autocomplete')).toBe('off');
  });

  it('falls back to a plain input when the library lacks the new Places API', () => {
    // An older/legacy-only Places library: no AutocompleteSuggestion.
    mockUseMapsLibrary.mockReturnValue({ Autocomplete: class {} });

    render(<PlacesAutocompleteInput value="" onChange={vi.fn()} placeholder="Address" />);

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByPlaceholderText('Address')).toBeTruthy();
  });
});
