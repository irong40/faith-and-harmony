import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Map, useMap } from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ArrowLeft, Crosshair, MapIcon } from 'lucide-react';
import { useGoogleMapsStatus } from '@/hooks/useGoogleMapsStatus';
import { useMapMissions } from '@/hooks/useMapMissions';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import JobMarker from '@/components/map/JobMarker';
import JobInfoCard from '@/components/map/JobInfoCard';
import OfflineFallback from '@/components/map/OfflineFallback';

const HAMPTON_ROADS = { lat: 36.85, lng: -76.29 };
const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'captured', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
];

function FitBounds({ missions }: { missions: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || missions.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    for (const m of missions) {
      bounds.extend({ lat: m.latitude, lng: m.longitude });
    }
    map.fitBounds(bounds, 60);
  }, [map, missions]);

  return null;
}

export default function PilotMap() {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const { isLoaded, loadError } = useGoogleMapsStatus();
  const { missions, isLoading } = useMapMissions(statusFilter.length > 0 ? statusFilter : null);
  const { latitude: myLat, longitude: myLng, refresh: refreshLocation, isLoading: locLoading } = useCurrentLocation();

  const map = useMap();

  const handleCenterOnMe = () => {
    if (myLat && myLng && map) {
      map.panTo({ lat: myLat, lng: myLng });
      map.setZoom(13);
    } else {
      refreshLocation();
    }
  };

  if (!navigator.onLine || loadError) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Link to="/pilot"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="font-semibold">Map View</h1>
          </div>
        </header>
        <div className="p-4">
          <OfflineFallback latitude={null} longitude={null} />
          <p className="text-center text-sm text-muted-foreground mt-4">Map tiles unavailable offline</p>
        </div>
      </div>
    );
  }

  if (!isLoaded || isLoading) {
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
          <h1 className="font-semibold flex-1">Map View</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCenterOnMe}
            disabled={locLoading}
          >
            <Crosshair className="h-4 w-4 mr-1" />
            {locLoading ? 'Locating...' : 'My Location'}
          </Button>
        </div>
        {/* Status Filter */}
        <div className="px-4 pb-2">
          <ToggleGroup
            type="multiple"
            value={statusFilter}
            onValueChange={setStatusFilter}
            className="justify-start gap-1"
          >
            {STATUS_OPTIONS.map(opt => (
              <ToggleGroupItem key={opt.value} value={opt.value} size="sm" className="text-xs">
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 relative">
        <Map
          defaultCenter={HAMPTON_ROADS}
          defaultZoom={10}
          gestureHandling="greedy"
          disableDefaultUI
          mapId="trestle-pilot-map"
          style={{ width: '100%', height: '100%' }}
        >
          {missions.map((m: any) => (
            <JobMarker
              key={m.id}
              lat={m.latitude}
              lng={m.longitude}
              status={m.status}
              onClick={() => setSelectedMission(m)}
            />
          ))}
          <FitBounds missions={missions} />
        </Map>

        {/* Info Card */}
        {selectedMission && (
          <JobInfoCard
            id={selectedMission.id}
            clientName={selectedMission.client_name}
            address={selectedMission.property_address}
            status={selectedMission.status}
            scheduledDate={selectedMission.scheduled_date}
            onClose={() => setSelectedMission(null)}
          />
        )}
      </div>
    </div>
  );
}
