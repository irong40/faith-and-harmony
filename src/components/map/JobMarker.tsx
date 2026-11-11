import { AdvancedMarker } from '@vis.gl/react-google-maps';
import { getStatusBadge } from '@/lib/droneJobStatus';

interface JobMarkerProps {
  lat: number;
  lng: number;
  status?: string;
  onClick?: () => void;
}

export default function JobMarker({ lat, lng, status = 'scheduled', onClick }: JobMarkerProps) {
  // 'in_progress' is not a drone_job_status value; the old map colored it like captured, so keep that.
  const color = getStatusBadge(status === 'in_progress' ? 'captured' : status).hex;

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
