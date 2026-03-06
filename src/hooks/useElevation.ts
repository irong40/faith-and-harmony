import { useQuery } from '@tanstack/react-query';
import { useGoogleMapsStatus } from './useGoogleMapsStatus';

interface ElevationResult {
  elevation_m: number;
  elevation_ft: number;
}

export function useElevation(latitude: number | null, longitude: number | null) {
  const { isLoaded } = useGoogleMapsStatus();

  // Round to 4 decimal places for cache key stability (~11m precision)
  const roundedLat = latitude != null ? Math.round(latitude * 10000) / 10000 : null;
  const roundedLng = longitude != null ? Math.round(longitude * 10000) / 10000 : null;

  return useQuery<ElevationResult | null>({
    queryKey: ['elevation', roundedLat, roundedLng],
    queryFn: async () => {
      if (roundedLat == null || roundedLng == null) return null;

      const elevator = new google.maps.ElevationService();
      const response = await elevator.getElevationForLocations({
        locations: [{ lat: roundedLat, lng: roundedLng }],
      });

      if (!response.results?.[0]) return null;

      const elevation_m = response.results[0].elevation;
      return {
        elevation_m: Math.round(elevation_m * 10) / 10,
        elevation_ft: Math.round(elevation_m * 3.28084),
      };
    },
    enabled: isLoaded && roundedLat != null && roundedLng != null && navigator.onLine,
    staleTime: Infinity,
  });
}
