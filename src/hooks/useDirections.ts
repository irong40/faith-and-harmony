import { useQuery } from '@tanstack/react-query';
import { useGoogleMapsStatus } from './useGoogleMapsStatus';
import type { MapCenter } from '@/types/map';

export function useDirections(origin: MapCenter | null, destination: MapCenter | null) {
  const { isLoaded } = useGoogleMapsStatus();

  return useQuery({
    queryKey: ['directions', origin?.lat, origin?.lng, destination?.lat, destination?.lng],
    queryFn: async () => {
      if (!origin || !destination) return null;

      const service = new google.maps.DirectionsService();
      const result = await service.route({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.DRIVING,
      });

      const leg = result.routes[0]?.legs[0];
      if (!leg) return null;

      return {
        result,
        distance: leg.distance?.text || '',
        distanceMeters: leg.distance?.value || 0,
        duration: leg.duration?.text || '',
        durationSeconds: leg.duration?.value || 0,
      };
    },
    enabled: isLoaded && !!origin && !!destination && navigator.onLine,
    staleTime: 30 * 60 * 1000, // 30 min
  });
}
