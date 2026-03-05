import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isNetworkAvailable } from './network-probe';

const SUPABASE_URL = 'https://test-project.supabase.co';
const SUPABASE_ANON_KEY = 'test-anon-key-1234';

vi.stubEnv('VITE_SUPABASE_URL', SUPABASE_URL);
vi.stubEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_ANON_KEY);

describe('isNetworkAvailable', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns true when fetch resolves with ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    const result = await isNetworkAvailable();
    expect(result).toBe(true);
  });

  it('returns false when fetch throws a network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await isNetworkAvailable();
    expect(result).toBe(false);
  });

  it('returns false when fetch times out via AbortController', async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = options?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        }),
    );

    vi.useFakeTimers();
    const promise = isNetworkAvailable();
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;
    vi.useRealTimers();

    expect(result).toBe(false);
  });

  it('returns false when response is not ok (500)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const result = await isNetworkAvailable();
    expect(result).toBe(false);
  });

  it('probe uses HEAD method and includes apikey header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    await isNetworkAvailable();

    expect(mockFetch).toHaveBeenCalledWith(
      `${SUPABASE_URL}/rest/v1/`,
      expect.objectContaining({
        method: 'HEAD',
        headers: expect.objectContaining({
          apikey: SUPABASE_ANON_KEY,
        }),
      }),
    );
  });
});
