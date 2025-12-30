import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
}

export function ProductImage({ 
  src, 
  alt, 
  className,
  aspectRatio = 'square' 
}: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const aspectClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: ''
  }[aspectRatio];

  return (
    <div className={cn("relative overflow-hidden bg-secondary", aspectClass, className)}>
      {/* Loading skeleton */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 bg-secondary animate-pulse">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/10 to-transparent animate-[shimmer_2s_infinite]" 
               style={{ 
                 animation: 'shimmer 2s infinite',
                 background: 'linear-gradient(90deg, transparent, hsl(var(--background) / 0.1), transparent)',
                 backgroundSize: '200% 100%'
               }} 
          />
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary text-muted-foreground">
          <ImageOff className="w-12 h-12 mb-2 opacity-50" />
          <span className="text-sm">Image unavailable</span>
        </div>
      )}

      {/* Actual image */}
      {!hasError && (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
}
