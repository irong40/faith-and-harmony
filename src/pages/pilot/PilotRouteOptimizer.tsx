import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Map, useMap } from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Crosshair, Clock, Route, Loader2, MapIcon } from 'lucide-react';
import { isToday } from 'date-fns';
import { useGoogleMapsStatus } from '@/hooks/useGoogleMapsStatus';
import { usePilotMissions } from '@/hooks/usePilotMissions';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { DirectionsRenderer } from '@/components/map/DirectionsPanel';
import JobMarker from '@/components/map/JobMarker';

const HAMPTON_ROADS = { lat: 36.85, lng: -76.29 };

function OptimizedRoute({
  origin,
  stops,
  onResult,
}: {
  origin: { lat: number; lng: number };
  stops: { lat: number; lng: number }[];
  onResult: (result: google.maps.DirectionsResult | null, totalDuration: string, totalDistance: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || stops.length === 0) return;

    const service = new google.maps.DirectionsService();

    const waypoints = stops.slice(0, -1).map(s => ({
      location: new google.maps.LatLng(s.lat, s.lng),
      stopover: true,
    }));

    const destination = stops[stops.length - 1];

    service.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const legs = result.routes[0]?.legs || [];
          const totalSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
          const totalMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.round((totalSeconds % 3600) / 60);
          const totalDuration = hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
          const totalDistance = totalMeters >= 1609
            ? `${(totalMeters / 1609.34).toFixed(1)} mi`
            : `${totalMeters} m`;

          onResult(result, totalDuration, totalDistance);
        } else {
          onResult(null, '', '');
        }
      },
    );
  }, [map, origin, stops, onResult]);

  return null;
}

export default function PilotRouteOptimizer() {
  const { isLoaded, loadError } = useGoogleMapsStatus();
  const { data: allMissions = [] } = usePilotMissions();
  const { latitude: myLat, longitude: myLng, refresh: refreshLocation, isLoading: locLoading } = useCurrentLocation();
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [totalDuration, setTotalDuration] = useState('');
  const [totalDistance, setTotalDistance] = useState('');

  // Filter today's missions with coordinates
  const todayMissions = useMemo(() => {
    return allMissions.filter(
      (m: any) =>
        m.latitude != null &&
        m.longitude != null &&
        m.scheduled_date &&
        isToday(new Date(m.scheduled_date)) &&
        m.status !== 'canceled'
    );
  }, [allMissions]);

  const origin = myLat && myLng ? { lat: myLat, lng: myLng } : null;
  const stops = todayMissions.map((m: any) => ({ lat: m.latitude, lng: m.longitude }));

  const handleResult = (result: google.maps.DirectionsResult | null, duration: string, distance: string) => {
    setDirectionsResult(result);
    setTotalDuration(duration);
    setTotalDistance(distance);
  };

  if (!navigator.onLine || loadError) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Link to="/pilot"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="font-semibold">Route Optimizer</h1>
          </div>
        </header>
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Route planning requires internet connection</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MapIcon className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-2 flex items-center gap-3">
          <Link to="/pilot"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <h1 className="font-semibold flex-1">Today's Route</h1>
          <Badge variant="secondary">{todayMissions.length} stops</Badge>
        </div>
      </header>

      {/* Location prompt */}
      {!origin && (
        <div className="p-4 border-b">
          <Button onClick={refreshLocation} disabled={locLoading} className="w-full">
            {locLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Getting your location...</>
            ) : (
              <><Crosshair className="mr-2 h-4 w-4" />Share location to optimize route</>
            )}
          </Button>
        </div>
      )}

      {/* Route summary */}
      {totalDuration && totalDistance && (
        <div className="px-4 py-2 border-b bg-card">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{totalDistance}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{totalDuration}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stop list */}
      {todayMissions.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/30 max-h-32 overflow-y-auto">
          <div className="space-y-1">
            {todayMissions.map((m: any, i: number) => (
              <Link key={m.id} to={`/pilot/mission/${m.id}`} className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded px-2 py-1">
                <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0 text-xs shrink-0">
                  {i + 1}
                </Badge>
                <span className="truncate">{m.client_name}</span>
                <span className="text-xs text-muted-foreground truncate ml-auto">{m.property_address}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {todayMissions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No jobs scheduled for today with coordinates</p>
          </div>
        ) : (
          <Map
            defaultCenter={HAMPTON_ROADS}
            defaultZoom={10}
            gestureHandling="greedy"
            disableDefaultUI
            mapId="trestle-route-map"
            style={{ width: '100%', height: '100%' }}
          >
            {todayMissions.map((m: any, i: number) => (
              <JobMarker
                key={m.id}
                lat={m.latitude}
                lng={m.longitude}
                status={m.status}
              />
            ))}
            {origin && stops.length > 0 && (
              <OptimizedRoute
                origin={origin}
                stops={stops}
                onResult={handleResult}
              />
            )}
            {directionsResult && <DirectionsRenderer result={directionsResult} />}
          </Map>
        )}
      </div>
    </div>
  );
}
