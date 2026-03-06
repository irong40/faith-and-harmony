import { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Route } from 'lucide-react';

interface DirectionsPanelProps {
  directionsResult: google.maps.DirectionsResult | null;
  distance: string;
  duration: string;
}

function DirectionsRenderer({ result }: { result: google.maps.DirectionsResult }) {
  const map = useMap();
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!map) return;

    const renderer = new google.maps.DirectionsRenderer({
      map,
      directions: result,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#5B2C6F',
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    rendererRef.current = renderer;

    return () => {
      renderer.setMap(null);
      rendererRef.current = null;
    };
  }, [map, result]);

  return null;
}

export default function DirectionsPanel({ directionsResult, distance, duration }: DirectionsPanelProps) {
  return (
    <>
      {directionsResult && <DirectionsRenderer result={directionsResult} />}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Route Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span>{distance}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{duration}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export { DirectionsRenderer };
