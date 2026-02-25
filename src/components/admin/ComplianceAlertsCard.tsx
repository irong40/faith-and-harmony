import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { getCertificationStatus, getDaysUntilExpiry } from '@/types/pilot';
import type { PilotProfile, CertificationStatus } from '@/types/pilot';

interface PilotWithStatus extends PilotProfile {
  certStatus: CertificationStatus;
  daysUntilExpiry: number | null;
}

const STATUS_BADGE: Record<CertificationStatus, { label: string; className: string; Icon: typeof ShieldCheck }> = {
  valid: { label: 'Valid', className: 'bg-green-500/10 text-green-700 border-green-500/30', Icon: ShieldCheck },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30', Icon: ShieldAlert },
  expiring_warning: { label: 'Expiring', className: 'bg-orange-500/10 text-orange-700 border-orange-500/30', Icon: ShieldAlert },
  expired: { label: 'EXPIRED', className: 'bg-red-500/10 text-red-700 border-red-500/30', Icon: ShieldX },
};

/**
 * Admin dashboard card showing pilots with expiring or expired Part 107 certs.
 * Shows pilots expiring within 30 days or already expired.
 */
export default function ComplianceAlertsCard() {
  const { data: alertPilots, isLoading } = useQuery({
    queryKey: ['compliance-alerts'],
    queryFn: async () => {
      // Get all pilot profiles with cert data
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, part_107_number, part_107_expiry')
        .not('part_107_number', 'is', null);

      if (error) throw error;

      const pilots = (data || []) as PilotProfile[];
      const now = new Date();
      const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      return pilots
        .map((p): PilotWithStatus => ({
          ...p,
          certStatus: getCertificationStatus(p.part_107_expiry),
          daysUntilExpiry: getDaysUntilExpiry(p.part_107_expiry),
        }))
        .filter((p) => {
          if (p.certStatus === 'expired') return true;
          if (!p.part_107_expiry) return false;
          return new Date(p.part_107_expiry) <= thirtyDaysOut;
        })
        .sort((a, b) => (a.daysUntilExpiry ?? -999) - (b.daysUntilExpiry ?? -999));
    },
    staleTime: 10 * 60 * 1000, // 10 min
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Compliance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!alertPilots?.length) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            Compliance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All pilot certifications are current.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Compliance Alerts
          <Badge variant="outline" className="ml-auto text-amber-700 border-amber-300 bg-amber-50">
            {alertPilots.length} {alertPilots.length === 1 ? 'pilot' : 'pilots'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alertPilots.map((pilot) => {
          const { label, className, Icon } = STATUS_BADGE[pilot.certStatus];
          return (
            <div key={pilot.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium truncate">{pilot.full_name || 'Unknown Pilot'}</span>
              <div className="flex items-center gap-2 shrink-0">
                {pilot.certStatus !== 'expired' && pilot.daysUntilExpiry != null && (
                  <span className="text-xs text-muted-foreground">
                    {pilot.daysUntilExpiry}d
                  </span>
                )}
                <Badge variant="outline" className={`text-xs ${className} flex items-center gap-1`}>
                  <Icon className="h-3 w-3" />
                  {label}
                </Badge>
              </div>
            </div>
          );
        })}
        <Link
          to="/admin/pilot-management"
          className="text-xs text-muted-foreground hover:text-foreground underline block mt-2"
        >
          Manage pilot certifications →
        </Link>
      </CardContent>
    </Card>
  );
}
