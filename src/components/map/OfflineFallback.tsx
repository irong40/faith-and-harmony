import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';

interface OfflineFallbackProps {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  className?: string;
}

export default function OfflineFallback({ latitude, longitude, address, className }: OfflineFallbackProps) {
  const openInMaps = () => {
    const query = address
      ? encodeURIComponent(address)
      : latitude && longitude
        ? `${latitude},${longitude}`
        : '';

    if (!query) return;

    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    if (isIOS) {
      window.open(`maps://maps.apple.com/?daddr=${query}`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
    }
  };

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-6 gap-3">
        <MapPin className="h-8 w-8 text-muted-foreground" />
        {latitude && longitude ? (
          <p className="text-sm text-muted-foreground">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No coordinates available</p>
        )}
        {(latitude && longitude) || address ? (
          <Button variant="outline" size="sm" onClick={openInMaps}>
            <Navigation className="mr-2 h-4 w-4" />
            Open in Maps
            <ExternalLink className="ml-2 h-3 w-3" />
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
