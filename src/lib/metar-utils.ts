/**
 * Parse a string to number, returning null for empty/invalid input.
 * Correctly handles "0" → 0 (not null).
 */
export function parseOrNull(v: string): number | null {
  if (v.trim() === '') return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

/**
 * Extract cloud ceiling from aviationweather.gov METAR JSON.
 * Ceiling = lowest BKN (broken) or OVC (overcast) layer base altitude.
 * Returns null if no ceiling layer exists (e.g., FEW/SCT only or clear skies).
 */
export function extractCeiling(metar: { clouds?: { cover: string; base?: number }[] }): number | null {
  const clouds = metar.clouds;
  if (!Array.isArray(clouds) || clouds.length === 0) return null;

  for (const layer of clouds) {
    if (['BKN', 'OVC'].includes(layer.cover)) {
      return layer.base ?? null;
    }
  }

  return null;
}
