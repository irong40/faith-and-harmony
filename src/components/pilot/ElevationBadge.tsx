import { Badge } from '@/components/ui/badge';
import { Mountain } from 'lucide-react';
import { useElevation } from '@/hooks/useElevation';

interface ElevationBadgeProps {
  latitude: number | null;
  longitude: number | null;
  laancCeilingAgl?: number | null;
}

export default function ElevationBadge({ latitude, longitude, laancCeilingAgl }: ElevationBadgeProps) {
  const { data: elevation, isLoading } = useElevation(latitude, longitude);

  if (!latitude || !longitude) return null;
  if (isLoading) return null;
  if (!elevation) {
    if (!navigator.onLine) {
      return (
        <span className="text-xs text-muted-foreground">Elevation unavailable offline</span>
      );
    }
    return null;
  }

  const mslFromAgl = laancCeilingAgl ? elevation.elevation_ft + laancCeilingAgl : null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="gap-1 text-xs">
        <Mountain className="h-3 w-3" />
        Terrain: {elevation.elevation_ft} ft MSL
      </Badge>
      {laancCeilingAgl && mslFromAgl && (
        <span className="text-xs text-muted-foreground">
          {laancCeilingAgl} ft AGL = {mslFromAgl} ft MSL
        </span>
      )}
    </div>
  );
}
