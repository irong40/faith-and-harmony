import { useApiLoadingStatus, APILoadingStatus } from '@vis.gl/react-google-maps';

export function useGoogleMapsStatus() {
  const status = useApiLoadingStatus();

  return {
    isLoaded: status === APILoadingStatus.LOADED,
    loadError: status === APILoadingStatus.FAILED,
  };
}
