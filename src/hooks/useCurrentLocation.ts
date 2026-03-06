import { useState, useCallback } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
}

export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: false,
  });

  const refresh = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported', isLoading: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          isLoading: false,
        });
      },
      (err) => {
        let errorMsg = 'Unable to get location';
        if (err.code === err.PERMISSION_DENIED) errorMsg = 'Location permission denied';
        else if (err.code === err.POSITION_UNAVAILABLE) errorMsg = 'Location unavailable';
        else if (err.code === err.TIMEOUT) errorMsg = 'Location request timed out';

        setState(prev => ({
          ...prev,
          error: errorMsg,
          isLoading: false,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  return { ...state, refresh };
}
