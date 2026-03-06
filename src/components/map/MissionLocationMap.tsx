import { Card, CardContent } from '@/components/ui/card';
import MapContainer from './MapContainer';
import JobMarker from './JobMarker';

interface MissionLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  status?: string;
  address?: string;
}

export default function MissionLocationMap({ latitude, longitude, status, address }: MissionLocationMapProps) {
  if (!latitude || !longitude) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <MapContainer
          center={{ lat: latitude, lng: longitude }}
          zoom={15}
          height="200px"
          gestureHandling="cooperative"
          latitude={latitude}
          longitude={longitude}
          address={address}
        >
          <JobMarker lat={latitude} lng={longitude} status={status} />
        </MapContainer>
      </CardContent>
    </Card>
  );
}
