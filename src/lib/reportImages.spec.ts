import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Signed-URL resolver — step 2 of the report-images bucket privatization.
//
// The contract under test (writer side ships in parallel):
//   (a) values starting with "http" are legacy public URLs -> pass through,
//       NEVER hit the storage API;
//   (b) scheme-less values are object paths in the `report-images` bucket ->
//       createSignedUrl(path, 1h), cached per path, deduped in flight,
//       failures -> null and NOT cached (so transient errors retry).
//
// These tests mock the supabase client entirely: the real bucket is still
// public today and must not be touched from CI.
// ---------------------------------------------------------------------------

const { createSignedUrl, storageFrom } = vi.hoisted(() => {
  const createSignedUrl = vi.fn();
  const storageFrom = vi.fn(() => ({ createSignedUrl }));
  return { createSignedUrl, storageFrom };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { storage: { from: storageFrom } },
}));

import {
  REPORT_IMAGES_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  clearReportImageUrlCache,
  peekReportImageUrl,
  prewarmReportImageUrls,
  resolveReportImageUrl,
} from './reportImages';

const PATH = 'DJ-2026-0006/vari_heatmap.png';
const SIGNED = 'https://project.supabase.co/storage/v1/object/sign/report-images/DJ-2026-0006/vari_heatmap.png?token=abc';

beforeEach(() => {
  clearReportImageUrlCache();
  createSignedUrl.mockReset();
  storageFrom.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('resolveReportImageUrl — http passthrough (legacy public URLs)', () => {
  it('returns https URLs untouched without calling the storage API', async () => {
    const url = 'https://project.supabase.co/storage/v1/object/public/report-images/a/b.png';
    await expect(resolveReportImageUrl(url)).resolves.toBe(url);
    expect(storageFrom).not.toHaveBeenCalled();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns plain http URLs untouched (contract says "starting with http")', async () => {
    const url = 'http://legacy.example.com/img.png';
    await expect(resolveReportImageUrl(url)).resolves.toBe(url);
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('passes data: and blob: values through defensively', async () => {
    await expect(resolveReportImageUrl('data:image/png;base64,AAA')).resolves.toBe('data:image/png;base64,AAA');
    await expect(resolveReportImageUrl('blob:https://app/123')).resolves.toBe('blob:https://app/123');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('returns null for empty values without calling the storage API', async () => {
    await expect(resolveReportImageUrl('')).resolves.toBeNull();
    await expect(resolveReportImageUrl(null)).resolves.toBeNull();
    await expect(resolveReportImageUrl(undefined)).resolves.toBeNull();
    expect(createSignedUrl).not.toHaveBeenCalled();
  });
});

describe('resolveReportImageUrl — bucket-relative paths', () => {
  it('signs against the report-images bucket with the exact path and a 1h TTL', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: SIGNED }, error: null });

    await expect(resolveReportImageUrl(PATH)).resolves.toBe(SIGNED);

    expect(REPORT_IMAGES_BUCKET).toBe('report-images');
    expect(SIGNED_URL_TTL_SECONDS).toBe(3600);
    expect(storageFrom).toHaveBeenCalledWith('report-images');
    expect(createSignedUrl).toHaveBeenCalledExactlyOnceWith(PATH, 3600);
  });

  it('tolerates an accidental leading slash on the stored path', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: SIGNED }, error: null });

    await expect(resolveReportImageUrl(`/${PATH}`)).resolves.toBe(SIGNED);
    expect(createSignedUrl).toHaveBeenCalledWith(PATH, 3600);
  });

  it('caches per path: a report with 12 images signs each path once, not once per render', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: SIGNED }, error: null });

    await resolveReportImageUrl(PATH);
    await resolveReportImageUrl(PATH);
    await resolveReportImageUrl(PATH);

    expect(createSignedUrl).toHaveBeenCalledTimes(1);
    // The cached URL is also visible synchronously.
    expect(peekReportImageUrl(PATH)).toBe(SIGNED);
  });

  it('dedupes concurrent in-flight requests for the same path', async () => {
    let release!: (v: { data: { signedUrl: string }; error: null }) => void;
    createSignedUrl.mockReturnValue(new Promise((resolve) => { release = resolve; }));

    const [a, b] = [resolveReportImageUrl(PATH), resolveReportImageUrl(PATH)];
    release({ data: { signedUrl: SIGNED }, error: null });

    await expect(Promise.all([a, b])).resolves.toEqual([SIGNED, SIGNED]);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('re-signs after the cached entry expires (TTL minus safety margin)', async () => {
    vi.useFakeTimers();
    createSignedUrl.mockResolvedValue({ data: { signedUrl: SIGNED }, error: null });

    await resolveReportImageUrl(PATH);
    expect(createSignedUrl).toHaveBeenCalledTimes(1);

    // 5 minutes before nominal expiry the entry is already considered stale.
    vi.setSystemTime(Date.now() + SIGNED_URL_TTL_SECONDS * 1000);
    expect(peekReportImageUrl(PATH)).toBeNull();

    await resolveReportImageUrl(PATH);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });
});

describe('resolveReportImageUrl — failure behavior', () => {
  it('returns null when createSignedUrl reports an error', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Object not found' } });
    await expect(resolveReportImageUrl(PATH)).resolves.toBeNull();
  });

  it('returns null when createSignedUrl throws (network failure)', async () => {
    createSignedUrl.mockRejectedValue(new Error('fetch failed'));
    await expect(resolveReportImageUrl(PATH)).resolves.toBeNull();
  });

  it('does NOT cache failures — the next call retries', async () => {
    createSignedUrl
      .mockResolvedValueOnce({ data: null, error: { message: 'transient' } })
      .mockResolvedValueOnce({ data: { signedUrl: SIGNED }, error: null });

    await expect(resolveReportImageUrl(PATH)).resolves.toBeNull();
    await expect(resolveReportImageUrl(PATH)).resolves.toBe(SIGNED);
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
  });
});

describe('peekReportImageUrl — synchronous lookups', () => {
  it('resolves http values synchronously (this is the no-flash guarantee)', () => {
    expect(peekReportImageUrl('https://x/y.png')).toBe('https://x/y.png');
  });

  it('returns null for an unsigned path until resolution completes', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: SIGNED }, error: null });
    expect(peekReportImageUrl(PATH)).toBeNull();
    await resolveReportImageUrl(PATH);
    expect(peekReportImageUrl(PATH)).toBe(SIGNED);
  });
});

describe('prewarmReportImageUrls — eager resolution for the print path', () => {
  it('resolves every path up front and never rejects on individual failures', async () => {
    createSignedUrl
      .mockResolvedValueOnce({ data: { signedUrl: SIGNED }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'denied' } });

    await expect(
      prewarmReportImageUrls([PATH, 'DJ-2026-0007/broken.png', 'https://legacy/ok.png', null])
    ).resolves.toBeUndefined();

    // Two paths hit the API; the http and null values never did.
    expect(createSignedUrl).toHaveBeenCalledTimes(2);
    // The successful path is now cached for the print snapshot.
    expect(peekReportImageUrl(PATH)).toBe(SIGNED);
  });
});
