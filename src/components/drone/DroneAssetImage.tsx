import { useSignedDroneAssetUrl } from '@/lib/droneAssetUrl';

interface DroneAssetImageProps {
  /** drone_assets.file_path — a bucket-relative path or a legacy full URL. */
  filePath: string | null | undefined;
  alt: string;
  className?: string;
}

/**
 * <img> for an object in the private `drone-jobs` bucket.
 *
 * The bucket has been private since 20260305600100, so getPublicUrl() against
 * it yields a URL that cannot load. Every drone-asset thumbnail goes through
 * here so there is one signing path rather than a public-URL call per render
 * site.
 *
 * A missing object renders nothing rather than a broken-image icon: several
 * drone_assets rows point at files that are not in storage, and a broken
 * thumbnail reads as a loading bug rather than as absent data.
 */
export default function DroneAssetImage({ filePath, alt, className }: DroneAssetImageProps) {
  const { url, status } = useSignedDroneAssetUrl(filePath);

  if (status === 'loading') {
    return (
      <div
        aria-hidden="true"
        data-testid="drone-asset-image-loading"
        className={`animate-pulse rounded bg-muted ${className ?? ''}`}
      />
    );
  }

  if (!url) return null;

  return <img src={url} alt={alt} className={className} />;
}
