import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Render-site behavior for the report-images privatization (step 2 of 3).
//
// Every report section that shows attached images now renders through
// SignedImage + useRenderableReportImages. This spec pins the three visible
// behaviors the section components must exhibit in BOTH bucket worlds:
//
//   1. legacy http values render immediately, storage API never touched;
//   2. bucket-relative paths show a neutral shimmer (never a broken <img>)
//      until the signed URL lands, then render it — and the shimmer is
//      print:hidden so a print race cannot put a placeholder in a client PDF;
//   3. a signing failure makes the image behave exactly like a MISSING image:
//      the entry drops out and the section's own empty-state logic takes over
//      (edit-mode hint only; preview/print render nothing).
// ---------------------------------------------------------------------------

const { createSignedUrl, storageFrom } = vi.hoisted(() => {
  const createSignedUrl = vi.fn();
  const storageFrom = vi.fn(() => ({ createSignedUrl }));
  return { createSignedUrl, storageFrom };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: storageFrom } },
}));

import { clearReportImageUrlCache } from '@/lib/reportImages';
import { AnnotatedImagery } from './sections/AnnotatedImagery';
import { GenericNarrative } from './sections/GenericNarrative';
import type { ReportImage } from '@/types/report';

const SIGNED = 'https://project.supabase.co/storage/v1/object/sign/report-images/DJ-2026-0006/vari_heatmap.png?token=abc';
const HTTP_URL = 'https://project.supabase.co/storage/v1/object/public/report-images/legacy.png';

const noop = () => {};

function reportImage(overrides: Partial<ReportImage>): ReportImage {
  return {
    id: 'img-1',
    report_id: 'rpt-1',
    section_key: 'annotated_imagery',
    image_url: 'DJ-2026-0006/vari_heatmap.png',
    sort_order: 0,
    ...overrides,
  };
}

beforeEach(() => {
  clearReportImageUrlCache();
  createSignedUrl.mockReset();
  storageFrom.mockClear();
});

describe('report sections — legacy http values (public-bucket world)', () => {
  it('renders the <img> immediately with the stored URL and never calls the storage API', () => {
    const { container } = render(
      <AnnotatedImagery
        data={{ description: 'desc' }}
        onChange={noop}
        mode="preview"
        images={[reportImage({ image_url: HTTP_URL })]}
      />
    );

    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe(HTTP_URL);
    // No loading frame for http values — this is the no-flash guarantee.
    expect(container.querySelector('[data-testid="signed-image-loading"]')).toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});

describe('report sections — bucket-relative paths (private-bucket world)', () => {
  it('shows a print-hidden shimmer (no broken <img>) and swaps in the signed URL when it lands', async () => {
    let release!: (v: { data: { signedUrl: string }; error: null }) => void;
    createSignedUrl.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    const { container } = render(
      <AnnotatedImagery
        data={{ description: 'desc' }}
        onChange={noop}
        mode="preview"
        images={[reportImage({})]}
      />
    );

    // Async gap: no <img> yet (a raw path as src would flash a broken image),
    // just the neutral shimmer — which must be print:hidden so it can never
    // appear in a printed report.
    expect(container.querySelector('img')).toBeNull();
    const shimmer = container.querySelector('[data-testid="signed-image-loading"]');
    expect(shimmer).toBeTruthy();
    expect(shimmer!.className).toContain('print:hidden');
    expect(shimmer!.className).toContain('animate-pulse');

    release({ data: { signedUrl: SIGNED }, error: null });

    await waitFor(() => {
      expect(container.querySelector('img')?.getAttribute('src')).toBe(SIGNED);
    });
    expect(container.querySelector('[data-testid="signed-image-loading"]')).toBeNull();
    expect(createSignedUrl).toHaveBeenCalledWith('DJ-2026-0006/vari_heatmap.png', 3600);
  });

  it('mixed lists resolve independently: http renders at once, the path joins when signed', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: SIGNED }, error: null });

    const { container } = render(
      <GenericNarrative
        data={{ description: 'desc' }}
        onChange={noop}
        mode="preview"
        images={[
          reportImage({ id: 'img-http', section_key: 'property_overview', image_url: HTTP_URL }),
          reportImage({ id: 'img-path', section_key: 'property_overview' }),
        ]}
        config={{ title: 'Property Overview', showImages: true }}
      />
    );

    expect(container.querySelector(`img[src="${HTTP_URL}"]`)).toBeTruthy();

    await waitFor(() => {
      const srcs = Array.from(container.querySelectorAll('img')).map((el) => el.getAttribute('src'));
      expect(srcs).toEqual([HTTP_URL, SIGNED]);
    });
  });
});

describe('report sections — signing failure behaves as a missing image', () => {
  it('preview: the failed entry drops out and the section shows its own missing-image state', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });

    const { container, getByText } = render(
      <AnnotatedImagery
        data={{ description: 'desc' }}
        onChange={noop}
        mode="preview"
        images={[reportImage({})]}
      />
    );

    // Once resolution fails the entry is gone: no <img>, no wrapper remnant —
    // the exact empty-state used when no images were attached at all.
    await waitFor(() => {
      expect(getByText('No annotated images attached')).toBeTruthy();
    });
    expect(container.querySelector('img')).toBeNull();
  });

  it('preview: generic sections render NOTHING on failure (a client PDF never carries a placeholder)', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });

    const { container } = render(
      <GenericNarrative
        data={{ description: 'desc' }}
        onChange={noop}
        mode="preview"
        images={[reportImage({ section_key: 'property_overview' })]}
        config={{ title: 'Property Overview', showImages: true, emptyImageLabel: 'Attach a site photo' }}
      />
    );

    await waitFor(() => {
      expect(createSignedUrl).toHaveBeenCalled();
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('[data-testid="signed-image-loading"]')).toBeNull();
    });
    // The dashed emptyImageLabel box is an EDIT-MODE hint only — preview/print
    // must not grow one because signing failed.
    expect(container.querySelector('.border-dashed')).toBeNull();
  });

  it('edit mode: the failed entry counts as missing, so the emptyImageLabel hint appears', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'denied' } });

    const { getByText } = render(
      <GenericNarrative
        data={{ description: 'desc' }}
        onChange={noop}
        mode="edit"
        images={[reportImage({ section_key: 'property_overview' })]}
        config={{ title: 'Property Overview', showImages: true, emptyImageLabel: 'Attach a site photo' }}
      />
    );

    await waitFor(() => {
      expect(getByText('Attach a site photo')).toBeTruthy();
    });
  });
});
