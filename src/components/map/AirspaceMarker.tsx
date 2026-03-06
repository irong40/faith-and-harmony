import { AdvancedMarker } from '@vis.gl/react-google-maps';

const CLASS_COLORS: Record<string, string> = {
  B: '#2563eb',
  C: '#9333ea',
  D: '#60a5fa',
  E: '#fb7185',
  G: '#16a34a',
};

interface AirspaceMarkerProps {
  lat: number;
  lng: number;
  facilityName: string;
  airspaceClass: string;
}

export default function AirspaceMarker({ lat, lng, facilityName, airspaceClass }: AirspaceMarkerProps) {
  const bgColor = CLASS_COLORS[airspaceClass] || '#6b7280';

  return (
    <AdvancedMarker position={{ lat, lng }}>
      <div
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-white shadow-md"
        style={{ backgroundColor: bgColor }}
      >
        <span>{facilityName}</span>
        <span className="font-bold">{airspaceClass}</span>
      </div>
    </AdvancedMarker>
  );
}
