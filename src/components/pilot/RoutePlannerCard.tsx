import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Route, Navigation, Clock, Loader2 } from 'lucide-react';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useDirections } from '@/hooks/useDirections';

interface RoutePlannerCardProps {
  latitude: number | null;
  longitude: number | null;
  todayJobCount?: number;
}

export default function RoutePlannerCard({ latitude, longitude, todayJobCount = 0 }: RoutePlannerCardProps) {
  const { latitude: myLat, longitude: myLng, refresh, isLoading: locLoading, error: locError } = useCurrentLocation();
  const origin = myLat && myLng ? { lat: myLat, lng: myLng } : null;
  const destination = latitude && longitude ? { lat: latitude, lng: longitude } : null;
  const { data: directions, isLoading: dirLoading } = useDirections(origin, destination);

  if (!navigator.onLine) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">Route planning requires internet</p>
        </CardContent>
      </Card>
    );
  }

  if (!latitude || !longitude) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Route className="h-4 w-4" />
          Route Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!origin && (
          <Button variant="outline" size="sm" onClick={refresh} disabled={locLoading} className="w-full">
            {locLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Getting location...</>
            ) : (
              <><Navigation className="mr-2 h-4 w-4" />Get distance from my location</>
            )}
          </Button>
        )}

        {locError && (
          <p className="text-xs text-destructive">{locError}</p>
        )}

        {origin && dirLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating route...
          </div>
        )}

        {directions && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span>{directions.distance}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{directions.duration}</span>
            </div>
          </div>
        )}

        {directions && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
              window.open(url, '_blank');
            }}
          >
            <Navigation className="mr-2 h-4 w-4" />
            Navigate
          </Button>
        )}

        {todayJobCount >= 2 && (
          <Link to="/pilot/route">
            <Button variant="secondary" size="sm" className="w-full">
              Optimize Today's Route ({todayJobCount} jobs)
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
