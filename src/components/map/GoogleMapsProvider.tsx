import { APIProvider } from '@vis.gl/react-google-maps';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  if (!API_KEY) {
    return <>{children}</>;
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={['places', 'geometry', 'marker']}>
      {children}
    </APIProvider>
  );
}
