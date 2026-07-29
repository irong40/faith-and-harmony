import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ReportImage } from '@/types/report';

/**
 * Report image URL resolution — step 2 of the report-images bucket
 * privatization.
 *
 * CONTRACT (writer side, being shipped in parallel): image values stored in
 * job_reports / report_images come in exactly two forms:
 *   (a) legacy full public URLs starting with "http"  -> load as-is, and
 *   (b) bucket-relative object paths with no scheme (e.g.
 *       "DJ-2026-0006/vari_heatmap.png") belonging to the `report-images`
 *       bucket -> resolve via createSignedUrl().
 *
 * This module must work in BOTH worlds: today the bucket is still public
 * (legacy http URLs keep working, path values sign fine either way), and
 * after the flip only signed URLs will load. Never touch the bucket here.
 *
 * The signed-URL cache is module-level and keyed by object path so a report
 * with 12 images signs each path once per session, not once per render or
 * once per component. Entries expire 5 minutes before the signed URL itself
 * does, so a cached URL handed to an <img> always has usable life left.
 */

export const REPORT_IMAGES_BUCKET = 'report-images';

/** Signed URLs live for 1 hour. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Drop cached entries 5 minutes before the signed URL expires. */
const CACHE_SAFETY_MS = 5 * 60 * 1000;

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const resolvedCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

/** Values that are already loadable without signing (contract case (a)). */
function isDirectUrl(value: string): boolean {
  // "http" covers http:// and https:// per the writer contract; data:/blob:
  // are passed through defensively (thumbnail data-URL fallbacks elsewhere
  // in the app must never be sent to the storage API as object paths).
  return (
    value.startsWith('http') ||
    value.startsWith('data:') ||
    value.startsWith('blob:')
  );
}

/** Bucket-relative object path: tolerate an accidental leading slash. */
function normalizePath(value: string): string {
  return value.replace(/^\/+/, '');
}

function cacheGet(path: string): string | null {
  const entry = resolvedCache.get(path);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    resolvedCache.delete(path);
    return null;
  }
  return entry.url;
}

/**
 * Synchronous lookup: direct URLs and fresh cache hits resolve without a
 * network hop (this is what lets http values render with zero flash).
 * Returns null when resolution would require an async createSignedUrl call.
 */
export function peekReportImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isDirectUrl(value)) return value;
  return cacheGet(normalizePath(value));
}

/**
 * Resolve one stored image value to a loadable URL.
 *  - http/data:/blob: values pass through untouched.
 *  - bucket-relative paths resolve via createSignedUrl on `report-images`,
 *    deduped across concurrent callers and cached for the TTL.
 *  - failures resolve to null (never throw) and are NOT cached, so a
 *    transient signing error retries on the next render/mount.
 */
export async function resolveReportImageUrl(
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null;
  if (isDirectUrl(value)) return value;

  const path = normalizePath(value);
  const cached = cacheGet(path);
  if (cached) return cached;

  const pending = inflight.get(path);
  if (pending) return pending;

  const promise = (async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(REPORT_IMAGES_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) return null;
      resolvedCache.set(path, {
        url: data.signedUrl,
        expiresAt: Date.now() + SIGNED_URL_TTL_SECONDS * 1000 - CACHE_SAFETY_MS,
      });
      return data.signedUrl;
    } catch {
      return null;
    } finally {
      inflight.delete(path);
    }
  })();

  inflight.set(path, promise);
  return promise;
}

/**
 * Eagerly resolve a batch of image values (fire on report load, and await
 * before window.print(): the print dialog snapshots the DOM synchronously,
 * so every signed URL must exist BEFORE printing, not after).
 * Failures are swallowed — a bad image must not block the print path.
 */
export async function prewarmReportImageUrls(
  values: Array<string | null | undefined>
): Promise<void> {
  await Promise.all(values.map((value) => resolveReportImageUrl(value)));
}

/** Test seam. */
export function clearReportImageUrlCache(): void {
  resolvedCache.clear();
  inflight.clear();
}

// ---------------------------------------------------------------------------
// React bindings
// ---------------------------------------------------------------------------

export interface SignedImageState {
  url: string | null;
  status: 'loading' | 'resolved' | 'error';
}

/**
 * Resolve a single stored image value for rendering.
 * http values and cache hits resolve synchronously on first render (no
 * loading frame); paths go through the shared cache/dedupe above.
 */
export function useSignedImageUrl(value: string | null | undefined): SignedImageState {
  const [state, setState] = useState<SignedImageState>(() => {
    const direct = peekReportImageUrl(value);
    if (direct != null) return { url: direct, status: 'resolved' };
    return { url: null, status: value ? 'loading' : 'error' };
  });

  useEffect(() => {
    let cancelled = false;
    const direct = peekReportImageUrl(value);
    if (direct != null) {
      setState((prev) =>
        prev.status === 'resolved' && prev.url === direct
          ? prev
          : { url: direct, status: 'resolved' }
      );
      return;
    }
    if (!value) {
      setState((prev) => (prev.status === 'error' ? prev : { url: null, status: 'error' }));
      return;
    }
    setState((prev) => (prev.status === 'loading' ? prev : { url: null, status: 'loading' }));
    resolveReportImageUrl(value).then((url) => {
      if (cancelled) return;
      setState(url ? { url, status: 'resolved' } : { url: null, status: 'error' });
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return state;
}

const EMPTY_IMAGES: ReportImage[] = [];

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

/**
 * Section-level list resolution: returns the images that are renderable,
 * DROPPING entries whose signing failed. A failed image therefore behaves
 * exactly like a missing image — the section's own empty-state logic
 * (edit-mode hints only; preview/print render nothing, never placeholders)
 * takes over with no extra branches in the section components.
 * Pending entries stay in the list; the per-image <SignedImage> shows a
 * neutral shimmer for those until their URL lands.
 */
export function useRenderableReportImages(images?: ReportImage[]): ReportImage[] {
  const list = images ?? EMPTY_IMAGES;
  // Key by content, not array identity: callers rebuild this array via
  // .filter() on every parent render, and re-resolving on identity churn
  // would defeat the cache's purpose.
  const valuesKey = list.map((img) => img.image_url).join('\u0000');
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    const values = valuesKey === '' ? [] : valuesKey.split('\u0000');
    if (values.length === 0) {
      setFailed((prev) => (prev.size === 0 ? prev : new Set()));
      return;
    }
    Promise.all(
      values.map(async (value) => [value, await resolveReportImageUrl(value)] as const)
    ).then((results) => {
      if (cancelled) return;
      const bad = new Set(results.filter(([, url]) => url === null).map(([value]) => value));
      setFailed((prev) => (setsEqual(prev, bad) ? prev : bad));
    });
    return () => {
      cancelled = true;
    };
  }, [valuesKey]);

  return useMemo(
    () => (failed.size === 0 ? list : list.filter((img) => !failed.has(img.image_url))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- list is keyed by valuesKey above
    [valuesKey, failed]
  );
}
