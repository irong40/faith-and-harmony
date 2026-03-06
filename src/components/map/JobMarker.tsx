import { AdvancedMarker } from '@vis.gl/react-google-maps';

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',   // blue
  captured: '#f97316',    // orange (in_progress)
  in_progress: '#f97316',
  complete: '#22c55e',    // green
  canceled: '#6b7280',    // gray
};

interface JobMarkerProps {
  lat: number;
  lng: number;
  status?: string;
  onClick?: () => void;
}

export default function JobMarker({ lat, lng, status = 'scheduled', onClick }: JobMarkerProps) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.scheduled;

  return (
    <AdvancedMarker position={{ lat, lng }} onClick={onClick}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: color,
          border: '3px solid white',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          cursor: onClick ? 'pointer' : 'default',
        }}
      />
    </AdvancedMarker>
  );
}
