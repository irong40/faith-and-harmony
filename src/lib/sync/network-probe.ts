const PROBE_TIMEOUT_MS = 5000;

/**
 * Probes Supabase to determine actual network availability.
 * Returns false on a network error, a timeout, or a 5xx response.
 * Does not rely on navigator.onLine.
 *
 * 2026-11-07: this used to HEAD `/rest/v1/` and require response.ok. After
 * the switch to the sb_publishable_ key, the API root answers 401 to that
 * key, so every pilot was reported offline and the sync engine never pushed
 * the queue or pulled missions. The question here is reachability, so any
 * answer from the server counts; only a 5xx (server down) counts as offline.
 * `/auth/v1/health` is a GET health endpoint the publishable key may read.
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
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
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
