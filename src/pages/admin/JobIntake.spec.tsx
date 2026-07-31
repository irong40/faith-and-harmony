import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// jsdom ships none of the layout APIs Radix primitives probe on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const globalWithDom = globalThis as unknown as { ResizeObserver?: unknown };
globalWithDom.ResizeObserver ??= ResizeObserverStub;
if (typeof Element !== 'undefined') {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
}

// ---------------------------------------------------------------------------
// Harness
//
// This mounts the real JobIntake page. The point is to prove the new fields
// actually render and wire through to the drone_jobs insert payload — a
// source-inspection test would not have caught, for example, the property_type
// default failing to re-derive when the job type changes.
// ---------------------------------------------------------------------------

const TEMPLATES = [
  {
    id: '22222222-2222-2222-2222-222222222222',
    path_code: 'A',
    display_name: 'Real Estate Basic',
    description: null,
    preset_name: 're_basic',
    active: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    path_code: 'D',
    display_name: 'Mining Volumetrics',
    description: null,
    preset_name: 'mining_volumetrics',
    active: true,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    path_code: 'W',
    display_name: 'Wildlife Census Thermal',
    description: null,
    preset_name: 'wildlife_census_thermal',
    active: true,
  },
];

const insertedPayloads: Array<Record<string, unknown>> = [];

/** Chainable PostgREST stub: every builder method returns itself. */
function makeBuilder(result: { data: unknown; error: null }) {
  const builder: Record<string, unknown> = {};
  const chain = (): unknown => builder;
  for (const method of ['select', 'eq', 'in', 'order', 'limit', 'not', 'gte', 'lte', 'or']) {
    builder[method] = chain;
  }
  builder.single = () => Promise.resolve(result);
  builder.maybeSingle = () => Promise.resolve(result);
  builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
    Promise.resolve(result).then(resolve);
  return builder;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const data =
        table === 'processing_templates'
          ? TEMPLATES
          : table === 'clients'
            ? { id: '11111111-1111-1111-1111-111111111111', name: 'Acme', company: null, email: null, phone: null }
            : [];
      return {
        ...makeBuilder({ data, error: null }),
        insert: (payload: Record<string, unknown>) => {
          insertedPayloads.push(payload);
          return makeBuilder({ data: { id: 'new-job-id' }, error: null });
        },
      };
    },
  },
}));

vi.mock('@vis.gl/react-google-maps', () => ({
  useMapsLibrary: () => null,
}));

vi.mock('@/components/admin/ActivityFeed', () => ({
  emitActivityEvent: vi.fn().mockResolvedValue(undefined),
}));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

// The client picker owns its own Supabase traffic and a Radix popover; the
// fields under test do not depend on it.
vi.mock('@/components/admin/ClientAutocomplete', () => ({
  default: ({ onChange }: { onChange: (id: string) => void }) => (
    <button type="button" onClick={() => onChange('11111111-1111-1111-1111-111111111111')}>
      pick client
    </button>
  ),
}));
vi.mock('@/components/admin/ClientFormDialog', () => ({ default: () => null }));

import JobIntake from './JobIntake';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <JobIntake />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Radix Select is not keyboard-drivable in jsdom; drive the trigger directly. */
async function chooseJobType(label: string) {
  const trigger = screen.getByRole('combobox', { name: /job type/i });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  const option = await screen.findByRole('option', { name: new RegExp(label, 'i') });
  fireEvent.click(option);
}

describe('JobIntake — slice 5 fields', () => {
  beforeEach(() => {
    insertedPayloads.length = 0;
    navigate.mockReset();
    toast.mockReset();
  });

  it('renders the price field and every add-on checkbox', async () => {
    renderPage();

    expect(await screen.findByLabelText(/job price/i)).toBeTruthy();
    expect(screen.getByLabelText(/rush job/i)).toBeTruthy();
    expect(screen.getByLabelText(/video add-on/i)).toBeTruthy();
    expect(screen.getByLabelText(/vegetation analysis/i)).toBeTruthy();
    expect(screen.getByLabelText(/deliver flight tracks/i)).toBeTruthy();
  });

  it('checks deliver flight tracks by default — withholding is the exception', async () => {
    renderPage();
    const box = (await screen.findByLabelText(/deliver flight tracks/i)) as HTMLElement;
    // Radix renders a button with aria-checked, not a native input.
    expect(box.getAttribute('aria-checked')).toBe('true');
  });

  it('renders a property type picker defaulting to residential', async () => {
    renderPage();
    const trigger = await screen.findByRole('combobox', { name: /property type/i });
    expect(within(trigger).getByText('Residential')).toBeTruthy();
  });

  it('keeps the site address input wired to its label through the autocomplete wrapper', async () => {
    renderPage();
    const input = (await screen.findByLabelText(/site address/i)) as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.placeholder).toMatch(/start typing an address/i);
  });

  it('does not re-derive property_type once an admin has overridden it', async () => {
    renderPage();
    await screen.findByRole('combobox', { name: /job type/i });

    await chooseJobType('Mining Volumetrics');
    await waitFor(() => {
      const trigger = screen.getByRole('combobox', { name: /property type/i });
      expect(within(trigger).getByText('Land / Survey')).toBeTruthy();
    });

    // Admin overrides the suggestion...
    const propertyTrigger = screen.getByRole('combobox', { name: /property type/i });
    fireEvent.keyDown(propertyTrigger, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: /commercial/i }));

    // ...then changes the job type. The override must survive.
    await chooseJobType('Real Estate Basic');
    await waitFor(() => {
      const trigger = screen.getByRole('combobox', { name: /property type/i });
      expect(within(trigger).getByText('Commercial')).toBeTruthy();
    });
  });

  it('warns that an un-geocoded address has no coordinates for weather or airspace', async () => {
    renderPage();
    expect(
      await screen.findByText(/no coordinates yet/i),
    ).toBeTruthy();
  });

  it('defaults property_type from the chosen job type instead of silently filing everything residential', async () => {
    renderPage();
    await screen.findByRole('combobox', { name: /job type/i });

    await chooseJobType('Mining Volumetrics');

    await waitFor(() => {
      const trigger = screen.getByRole('combobox', { name: /property type/i });
      expect(within(trigger).getByText('Land / Survey')).toBeTruthy();
    });
  });

  it('maps a wildlife preset to wildlife_census', async () => {
    renderPage();
    await screen.findByRole('combobox', { name: /job type/i });

    await chooseJobType('Wildlife Census Thermal');

    await waitFor(() => {
      const trigger = screen.getByRole('combobox', { name: /property type/i });
      expect(within(trigger).getByText('Wildlife Census')).toBeTruthy();
    });
  });

  it('sends the new columns on submit, with job_price as a plain dollars integer', async () => {
    renderPage();
    await screen.findByRole('combobox', { name: /job type/i });

    fireEvent.click(screen.getByRole('button', { name: /pick client/i }));
    await chooseJobType('Mining Volumetrics');

    fireEvent.change(screen.getByPlaceholderText(/start typing an address/i), {
      target: { value: '1234 Main St, Norfolk, VA 23510' },
    });
    fireEvent.change(screen.getByLabelText(/job price/i), { target: { value: '$1,250' } });
    fireEvent.click(screen.getByLabelText(/rush job/i));
    fireEvent.click(screen.getByLabelText(/vegetation analysis/i));

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fireEvent.change(screen.getByLabelText(/scheduled date/i), { target: { value: future } });

    fireEvent.click(screen.getByRole('button', { name: /create job/i }));

    await waitFor(() => expect(insertedPayloads).toHaveLength(1));

    const payload = insertedPayloads[0];
    expect(payload.job_price).toBe(1250);
    expect(payload.property_type).toBe('land');
    expect(payload.is_rush).toBe(true);
    expect(payload.vegetation_analysis).toBe(true);
    expect(payload.video_addon).toBe(false);
    // Free-typed address: no suggestion was picked, so no coordinates are
    // invented for it.
    expect(payload.latitude).toBeNull();
    expect(payload.longitude).toBeNull();
    expect(payload.site_address).toBe('1234 Main St, Norfolk, VA 23510');
    // Untouched by this test, so it must carry its default rather than
    // arriving undefined and letting the DB default paper over a missing
    // field in the payload.
    expect(payload.deliver_flight_tracks).toBe(true);
  });

  it('sends deliver_flight_tracks false once the box is unchecked', async () => {
    renderPage();
    await screen.findByRole('combobox', { name: /job type/i });

    fireEvent.click(screen.getByRole('button', { name: /pick client/i }));
    await chooseJobType('Mining Volumetrics');

    fireEvent.change(screen.getByPlaceholderText(/start typing an address/i), {
      target: { value: '1234 Main St, Norfolk, VA 23510' },
    });
    fireEvent.click(screen.getByLabelText(/deliver flight tracks/i));

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fireEvent.change(screen.getByLabelText(/scheduled date/i), { target: { value: future } });

    fireEvent.click(screen.getByRole('button', { name: /create job/i }));

    await waitFor(() => expect(insertedPayloads).toHaveLength(1));
    expect(insertedPayloads[0].deliver_flight_tracks).toBe(false);
  });

  it('never sends source_platform — that column is the aircraft, not provenance', async () => {
    renderPage();
    await screen.findByRole('combobox', { name: /job type/i });

    fireEvent.click(screen.getByRole('button', { name: /pick client/i }));
    await chooseJobType('Real Estate Basic');
    fireEvent.change(screen.getByPlaceholderText(/start typing an address/i), {
      target: { value: '1 Test Way' },
    });
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    fireEvent.change(screen.getByLabelText(/scheduled date/i), { target: { value: future } });

    fireEvent.click(screen.getByRole('button', { name: /create job/i }));

    await waitFor(() => expect(insertedPayloads).toHaveLength(1));
    expect(insertedPayloads[0]).not.toHaveProperty('source_platform');
  });
});
