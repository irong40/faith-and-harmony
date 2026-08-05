import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Signed-URL resolution for objects in the private `drone-jobs` bucket.
 *
 * The bucket went private in 20260305600100, so getPublicUrl() against it
 * returns a URL that cannot load. Anything rendering a drone asset has to
 * sign it. This module is the one place that knows how.
 *
 * extractStoragePath lived in QADetailModal; it moved here when the sky
 * replacement panel needed the same logic, so there is a single definition
 * rather than two that can drift.
 */

export const DRONE_JOBS_BUCKET = 'drone-jobs';

/** Signed URLs live for 1 hour. */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Extract the storage path relative to the drone-jobs bucket root from a
 * file_path that may be a full public URL or a plain storage path.
 */
export function extractStoragePath(filePath: string): string | null {
  // Match public URL pattern (legacy rows before bucket went private)
  const publicMatch = filePath.match(/\/storage\/v1\/object\/(?:public|sign)\/drone-jobs\/(.+)/);
  if (publicMatch) return publicMatch[1];

  // Match authenticated/signed URL pattern
  const signedMatch = filePath.match(/\/object\/(?:public|sign|authenticated)\/drone-jobs\/(.+)/);
  if (signedMatch) return signedMatch[1];

  // If the path does not look like a full URL, treat it as a relative storage path
  if (!filePath.startsWith('http')) return filePath;

  return null;
}

export type SignedUrlStatus = 'loading' | 'ready' | 'error';

/**
 * Sign a drone asset's file_path for display.
 *
 * Returns status alongside the url so a caller can render a placeholder
 * rather than a broken image while the request is in flight, and can tell
 * "still signing" apart from "this object is gone".
 */
export function useSignedDroneAssetUrl(filePath: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<SignedUrlStatus>('loading');

  useEffect(() => {
    if (!filePath) {
      setUrl(null);
      setStatus('error');
      return;
    }

    const storagePath = extractStoragePath(filePath);
    if (!storagePath) {
      setUrl(null);
      setStatus('error');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    supabase.storage
      .from(DRONE_JOBS_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.signedUrl) {
          setUrl(null);
          setStatus('error');
          return;
        }
        setUrl(data.signedUrl);
        setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return { url, status };
}
