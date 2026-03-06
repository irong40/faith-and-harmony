import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import MapContainer from './MapContainer';
import JobMarker from './JobMarker';
import AirspaceMarker from './AirspaceMarker';
import TfrCircle from './TfrCircle';

interface AirspaceGrid {
  latitude: number;
  longitude: number;
  facility_name: string;
  airspace_class: string;
}

interface ActiveTfr {
  center_latitude: number | null;
  center_longitude: number | null;
  radius_nm: number | null;
  status: string;
  notam_number: string;
}

interface AirspaceMapOverlayProps {
  latitude: number;
  longitude: number;
  nearestGrid: AirspaceGrid | null;
  activeTfrs: ActiveTfr[];
}

function AutoFitBounds({
  latitude,
  longitude,
  nearestGrid,
  activeTfrs,
}: AirspaceMapOverlayProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: latitude, lng: longitude });

    if (nearestGrid) {
      bounds.extend({ lat: nearestGrid.latitude, lng: nearestGrid.longitude });
    }

    for (const tfr of activeTfrs) {
      if (tfr.center_latitude != null && tfr.center_longitude != null) {
        bounds.extend({ lat: tfr.center_latitude, lng: tfr.center_longitude });
      }
    }

    // Only fit bounds if we have more than just the job location
    if (nearestGrid || activeTfrs.length > 0) {
      map.fitBounds(bounds, 40);
    }
  }, [map, latitude, longitude, nearestGrid, activeTfrs]);

  return null;
}

export default function AirspaceMapOverlay({
  latitude,
  longitude,
  nearestGrid,
  activeTfrs,
}: AirspaceMapOverlayProps) {
  if (!navigator.onLine) return null;

  return (
    <MapContainer
      center={{ lat: latitude, lng: longitude }}
      zoom={12}
      height="250px"
      gestureHandling="greedy"
      latitude={latitude}
      longitude={longitude}
    >
      <JobMarker lat={latitude} lng={longitude} status="scheduled" />

      {nearestGrid && (
        <AirspaceMarker
          lat={nearestGrid.latitude}
          lng={nearestGrid.longitude}
          facilityName={nearestGrid.facility_name}
          airspaceClass={nearestGrid.airspace_class}
        />
      )}

      {activeTfrs.map((tfr) =>
        tfr.center_latitude != null &&
        tfr.center_longitude != null &&
        tfr.radius_nm != null ? (
          <TfrCircle
            key={tfr.notam_number}
            lat={tfr.center_latitude}
            lng={tfr.center_longitude}
            radiusNm={tfr.radius_nm}
            status={tfr.status}
          />
        ) : null
      )}

      <AutoFitBounds
        latitude={latitude}
        longitude={longitude}
        nearestGrid={nearestGrid}
        activeTfrs={activeTfrs}
      />
    </MapContainer>
  );
}
