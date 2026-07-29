import { useSignedImageUrl } from '@/lib/reportImages';

interface SignedImageProps {
  /** Stored image value: full http URL (legacy public) OR bucket-relative
   *  path in the `report-images` bucket (post-privatization contract). */
  value: string | null | undefined;
  alt: string;
  className?: string;
}

/**
 * Drop-in <img> for report images. Every report render site (preview pane,
 * hidden print view, any future thumbnail) goes through this so the
 * public->private bucket flip is a no-op for the components.
 *
 *  - http values render immediately (useSignedImageUrl resolves them
 *    synchronously — no loading frame, no flash).
 *  - path values show a neutral shimmer until the signed URL lands; the
 *    shimmer is print:hidden so a print race can never emit a placeholder
 *    box into a client PDF (prewarm on report load makes that race
 *    effectively unreachable anyway).
 *  - signing failures render nothing here; useRenderableReportImages then
 *    drops the entry entirely, so the section's own missing-image
 *    empty-state (edit-mode only) is what the operator sees.
 */
export function SignedImage({ value, alt, className }: SignedImageProps) {
  const { url, status } = useSignedImageUrl(value);

  if (status === 'loading') {
    return (
      <div
        aria-hidden="true"
        data-testid="signed-image-loading"
        className="h-24 w-full animate-pulse rounded bg-muted print:hidden"
      />
    );
  }

  if (!url) return null;

  return <img src={url} alt={alt} className={className} />;
}
