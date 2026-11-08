const PROBE_TIMEOUT_MS = 5000;

/**
 * Probes Supabase to determine actual network availability.
 * Returns false on a network error, a timeout, or a 5xx response.
 * Does not rely on navigator.onLine.
 *
 * 2026-11-07: this used to HEAD `/rest/v1/` with VITE_SUPABASE_ANON_KEY and
 * require response.ok. Production has no VITE_SUPABASE_ANON_KEY (the client
 * uses VITE_SUPABASE_PUBLISHABLE_KEY), so the probe sent `apikey: undefined`,
 * got 401, and every pilot was reported offline: the sync engine never pushed
 * the queue or pulled missions. It now sends the same key as the client to
 * `/auth/v1/health`, which that key may read (200). The question here is
 * reachability, so any answer counts; only a 5xx (server down) is offline.
 */
export async function isNetworkAvailable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`,
      {
        method: 'GET',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    return response.status < 500;
  } catch {
    clearTimeout(timer);
    return false;
  }
}
