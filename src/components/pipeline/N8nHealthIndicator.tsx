import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type HealthStatus = 'online' | 'degraded' | 'offline' | 'loading';

interface HeartbeatRow {
  last_ping: string;
  version: string | null;
  workflow_count: number | null;
  active_executions: number | null;
}

function getStatus(lastPing: string | null): HealthStatus {
  if (!lastPing) return 'offline';
  const ageMs = Date.now() - new Date(lastPing).getTime();
  const ageMin = ageMs / 60_000;
  if (ageMin < 10) return 'online';
  if (ageMin < 20) return 'degraded';
  return 'offline';
}

const STATUS_CONFIG: Record<
  HealthStatus,
  { label: string; dotColor: string; textColor: string; Icon: React.ElementType }
> = {
  loading: {
    label: 'Checking...',
    dotColor: 'bg-slate-400',
    textColor: 'text-slate-500',
    Icon: RefreshCw,
  },
  online: {
    label: 'n8n Online',
    dotColor: 'bg-green-500',
    textColor: 'text-green-700',
    Icon: Wifi,
  },
  degraded: {
    label: 'n8n Degraded',
    dotColor: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    Icon: AlertTriangle,
  },
  offline: {
    label: 'n8n Offline',
    dotColor: 'bg-red-500',
    textColor: 'text-red-700',
    Icon: WifiOff,
  },
};

export default function N8nHealthIndicator() {
  const [status, setStatus] = useState<HealthStatus>('loading');
  const [lastPing, setLastPing] = useState<string | null>(null);

  const fetchHeartbeat = async () => {
    const { data, error } = await supabase
      .from('n8n_heartbeat')
      .select('last_ping, version, workflow_count, active_executions')
      .eq('instance_id', 'primary')
      .maybeSingle<HeartbeatRow>();

    if (error || !data) {
      setStatus('offline');
      setLastPing(null);
      return;
    }

    setLastPing(data.last_ping);
    setStatus(getStatus(data.last_ping));
  };

  useEffect(() => {
    fetchHeartbeat();

    const interval = setInterval(fetchHeartbeat, 60_000);
    return () => clearInterval(interval);
  }, []);

  const config = STATUS_CONFIG[status];
  const Icon = config.Icon;

  const ageLabel = (() => {
    if (!lastPing) return null;
    const ageMs = Date.now() - new Date(lastPing).getTime();
    const ageMin = Math.floor(ageMs / 60_000);
    if (ageMin < 1) return 'just now';
    if (ageMin === 1) return '1 min ago';
    return `${ageMin} min ago`;
  })();

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        status === 'loading' && 'bg-slate-100',
        status === 'online' && 'bg-green-50',
        status === 'degraded' && 'bg-yellow-50',
        status === 'offline' && 'bg-red-50',
      )}
      title={lastPing ? `Last ping: ${ageLabel}` : 'No heartbeat received'}
    >
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          config.dotColor,
          status === 'loading' && 'animate-pulse',
        )}
      />
      <Icon
        className={cn(
          'h-3 w-3',
          config.textColor,
          status === 'loading' && 'animate-spin',
        )}
      />
      <span className={cn('hidden sm:inline', config.textColor)}>{config.label}</span>
    </div>
  );
}
