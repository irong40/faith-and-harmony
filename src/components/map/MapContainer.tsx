import { Map } from '@vis.gl/react-google-maps';
import { useGoogleMapsStatus } from '@/hooks/useGoogleMapsStatus';
import OfflineFallback from './OfflineFallback';
import type { MapCenter } from '@/types/map';

interface MapContainerProps {
  center: MapCenter;
  zoom?: number;
  height?: string;
  className?: string;
  gestureHandling?: 'cooperative' | 'greedy' | 'none' | 'auto';
  children?: React.ReactNode;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
}

export default function MapContainer({
  center,
  zoom = 15,
  height = '200px',
  className,
  gestureHandling = 'cooperative',
  children,
  latitude,
  longitude,
  address,
}: MapContainerProps) {
  const { isLoaded, loadError } = useGoogleMapsStatus();

  if (!navigator.onLine || loadError || !isLoaded) {
    return (
      <OfflineFallback
        latitude={latitude ?? center.lat}
        longitude={longitude ?? center.lng}
        address={address}
        className={className}
      />
    );
  }

  return (
    <div style={{ height }} className={className}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling={gestureHandling}
        disableDefaultUI
        mapId="trestle-map"
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
      >
        {children}
      </Map>
    </div>
  );
}
