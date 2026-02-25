import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface MetarAgeIndicatorProps {
  /** ISO timestamp of the METAR observation */
  observationTime: string | null;
  /** If true, displays a compact inline badge; if false shows full label */
  compact?: boolean;
}

type AgeTier = 'fresh' | 'caution' | 'stale';

function getAgeTier(ageMinutes: number): AgeTier {
  if (ageMinutes < 15) return 'fresh';
  if (ageMinutes < 30) return 'caution';
  return 'stale';
}

const TIER_STYLES: Record<AgeTier, string> = {
  fresh: 'bg-green-500/10 text-green-700 border-green-500/40',
  caution: 'bg-amber-500/10 text-amber-700 border-amber-500/40',
  stale: 'bg-red-500/10 text-red-700 border-red-500/40',
};

/**
 * Displays the age of a METAR observation with color-coded freshness tiers.
 * Auto-updates every 30 seconds.
 *
 * Tiers:
 * - Green:  < 15 minutes (fresh)
 * - Yellow: 15-30 minutes (caution)
 * - Red:    > 30 minutes (stale — blocks checklist advancement)
 */
export default function MetarAgeIndicator({
  observationTime,
  compact = false,
}: MetarAgeIndicatorProps) {
  const [now, setNow] = useState(() => Date.now());

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (!observationTime) {
    return (
      <Badge variant="outline" className="text-muted-foreground border-muted">
        <Clock className="mr-1 h-3 w-3" />
        METAR: no timestamp
      </Badge>
    );
  }

  const obsMs = new Date(observationTime).getTime();
  const ageMinutes = (now - obsMs) / 60_000;
  const tier = getAgeTier(ageMinutes);
  const ageLabel =
    ageMinutes < 1
      ? 'just now'
      : ageMinutes < 60
      ? `${Math.round(ageMinutes)} min old`
      : `${Math.round(ageMinutes / 60 * 10) / 10} hr old`;

  const isStale = tier === 'stale';

  if (compact) {
    return (
      <Badge variant="outline" className={TIER_STYLES[tier]}>
        <Clock className="mr-1 h-3 w-3" />
        {ageLabel}
        {isStale && ' (STALE)'}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${TIER_STYLES[tier]}`}>
      <Clock className="h-4 w-4 shrink-0" />
      <span className="font-medium">
        METAR: {ageLabel}
        {isStale && ' — STALE'}
      </span>
      {isStale && (
        <span className="text-xs opacity-80">Refresh required before proceeding</span>
      )}
    </div>
  );
}
