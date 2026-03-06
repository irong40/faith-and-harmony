import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';

interface TfrCircleProps {
  lat: number;
  lng: number;
  radiusNm: number;
  status: 'active' | 'scheduled' | string;
}

export default function TfrCircle({ lat, lng, radiusNm, status }: TfrCircleProps) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !coreLib) return;

    const radiusMeters = radiusNm * 1852;
    const isActive = status === 'active';

    const circle = new google.maps.Circle({
      map,
      center: { lat, lng },
      radius: radiusMeters,
      fillColor: isActive ? '#ef4444' : '#f59e0b',
      fillOpacity: 0.15,
      strokeColor: isActive ? '#ef4444' : '#f59e0b',
      strokeOpacity: 0.6,
      strokeWeight: 2,
    });

    circleRef.current = circle;

    return () => {
      circle.setMap(null);
      circleRef.current = null;
    };
  }, [map, coreLib, lat, lng, radiusNm, status]);

  return null;
}
