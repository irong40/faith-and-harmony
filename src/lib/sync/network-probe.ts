const PROBE_TIMEOUT_MS = 5000;

/**
 * Probes Supabase with a HEAD request to determine actual network availability.
 * Returns false on any error, timeout, or non-ok response.
 * Does not rely on navigator.onLine.
 */
export async function isNetworkAvailable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
      {
        method: 'HEAD',
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    return response.ok;
  } catch {
    clearTimeout(timer);
    return false;
  }
}
