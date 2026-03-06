import { useQuery } from '@tanstack/react-query';
import { useGoogleMapsStatus } from './useGoogleMapsStatus';
import type { MapCenter } from '@/types/map';

interface DistanceEntry {
  index: number;
  distance: string;
  distanceMeters: number;
  duration: string;
  durationSeconds: number;
}

export function useDistanceMatrix(origin: MapCenter | null, destinations: MapCenter[]) {
  const { isLoaded } = useGoogleMapsStatus();

  const destKey = destinations.map(d => `${d.lat},${d.lng}`).join('|');

  return useQuery<DistanceEntry[]>({
    queryKey: ['distance-matrix', origin?.lat, origin?.lng, destKey],
    queryFn: async () => {
      if (!origin || destinations.length === 0) return [];

      const service = new google.maps.DistanceMatrixService();
      const result = await service.getDistanceMatrix({
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: destinations.map(d => ({ lat: d.lat, lng: d.lng })),
        travelMode: google.maps.TravelMode.DRIVING,
      });

      const row = result.rows[0];
      if (!row) return [];

      return row.elements.map((el, i) => ({
        index: i,
        distance: el.distance?.text || '',
        distanceMeters: el.distance?.value || 0,
        duration: el.duration?.text || '',
        durationSeconds: el.duration?.value || 0,
      }));
    },
    enabled: isLoaded && !!origin && destinations.length > 0 && navigator.onLine,
    staleTime: 30 * 60 * 1000,
  });
}
