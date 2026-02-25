import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle, CheckCircle2, MapPin, Info, Clock, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useNearestAirspace,
  useActiveTfrs,
  useMissionAuthorization,
  useSaveMissionAuthorization,
  useTfrFreshness,
} from '@/hooks/useAirspaceAuth';
import type { TfrSummary } from '@/types/authorization';
import { logTfrReview } from '@/lib/safety-audit';

interface AirspacePanelProps {
  missionId: string;
  latitude: number | null;
  longitude: number | null;
  onAuthorizationReady: (data: { id: string; airspace_class: string; requires_laanc: boolean }) => void;
}

const AIRSPACE_COLORS: Record<string, string> = {
  B: 'bg-blue-600 text-white',
  C: 'bg-purple-600 text-white',
  D: 'bg-blue-400 text-white',
  E: 'bg-rose-400 text-white',
  G: 'bg-green-600 text-white',
};

export default function AirspacePanel({
  missionId,
  latitude,
  longitude,
  onAuthorizationReady,
}: AirspacePanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: nearestAirspace, isLoading: loadingAirspace } = useNearestAirspace(latitude, longitude);
  const { data: activeTfrs, isLoading: loadingTfrs } = useActiveTfrs(latitude, longitude);
  const { data: savedAuth, isLoading: loadingSaved } = useMissionAuthorization(missionId);
  const { data: tfrFreshness } = useTfrFreshness();
  const saveMutation = useSaveMissionAuthorization();

  // Notify parent of saved auth
  useEffect(() => {
    if (savedAuth) {
      onAuthorizationReady({
        id: savedAuth.id,
        airspace_class: savedAuth.airspace_class || 'G',
        requires_laanc: savedAuth.requires_laanc,
      });
    }
  }, [savedAuth]);

  if (!latitude || !longitude) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Location Not Set</AlertTitle>
        <AlertDescription>
          This mission does not have GPS coordinates. Contact your administrator to set the property location.
        </AlertDescription>
      </Alert>
    );
  }

  if (loadingAirspace || loadingTfrs || loadingSaved) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Already confirmed
  if (savedAuth && !saveMutation.isPending) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Airspace Check Complete</span>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span>Class {savedAuth.airspace_class || 'G'}</span>
            <Badge className={AIRSPACE_COLORS[savedAuth.airspace_class || 'G'] || 'bg-gray-500 text-white'}>
              {savedAuth.airspace_class || 'G'}
            </Badge>
          </div>
          {savedAuth.requires_laanc && (
            <div className="flex items-center gap-2">
              <span>LAANC Required — Ceiling: {savedAuth.max_approved_altitude_ft || 0} ft AGL</span>
            </div>
          )}
          {savedAuth.is_zero_grid && (
            <Badge variant="destructive" className="w-fit">Zero Grid — No UAS Operations</Badge>
          )}
          {(savedAuth.active_tfrs as TfrSummary[] | null)?.length ? (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>{(savedAuth.active_tfrs as TfrSummary[]).length} TFR(s) noted</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const grid = nearestAirspace?.grid;
  const distance = nearestAirspace?.distance_nm;
  const airspaceClass = grid?.airspace_class || 'G';
  const requiresLaanc = grid ? ['B', 'C', 'D'].includes(airspaceClass) && grid.laanc_eligible : false;
  const isZeroGrid = grid?.zero_grid || false;
  const ceiling = grid?.ceiling_ft || 0;

  const tfrSummaries: TfrSummary[] = (activeTfrs || []).map(tfr => ({
    notam_number: tfr.notam_number,
    description: tfr.description,
    distance_nm: Math.round(tfr.distance_nm * 10) / 10,
    status: tfr.status,
  }));

  const handleConfirm = async () => {
    try {
      const result = await saveMutation.mutateAsync({
        mission_id: missionId,
        airspace_class: airspaceClass,
        requires_laanc: requiresLaanc,
        is_zero_grid: isZeroGrid,
        max_approved_altitude_ft: ceiling,
        active_tfrs: tfrSummaries,
        determination_notes: grid
          ? `Nearest grid: ${grid.grid_id} (${grid.facility_name || 'N/A'}), ${distance} NM`
          : 'No airspace grid found — Class G assumed',
      });

      onAuthorizationReady({
        id: result.id,
        airspace_class: airspaceClass,
        requires_laanc: requiresLaanc,
      });

      // Safety audit: log TFR review
      if (user) {
        void logTfrReview(missionId, user.id, {
          airspaceClass,
          requiresLaanc,
          activeTfrCount: tfrSummaries.length,
        });
      }

      toast({ title: 'Airspace check confirmed' });
    } catch (error: any) {
      toast({
        title: 'Error saving airspace check',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Airspace Class */}
      <div className="flex items-center gap-3">
        <Badge className={`text-lg px-3 py-1 ${AIRSPACE_COLORS[airspaceClass] || 'bg-gray-500 text-white'}`}>
          Class {airspaceClass}
        </Badge>
        {grid ? (
          <span className="text-sm text-muted-foreground">
            {grid.facility_name || grid.grid_id} — {distance} NM
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            No controlled airspace within 15 NM
          </span>
        )}
      </div>

      {/* Zero Grid Warning */}
      {isZeroGrid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Zero Grid</AlertTitle>
          <AlertDescription>
            This grid has zero altitude authorization. UAS operations are not permitted without
            additional FAA authorization (COA or waiver).
          </AlertDescription>
        </Alert>
      )}

      {/* LAANC Info */}
      {requiresLaanc && !isZeroGrid && (
        <div className="p-3 rounded-lg border bg-muted/50 space-y-1">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Shield className="h-4 w-4" />
            LAANC Authorization Required
          </div>
          <p className="text-sm text-muted-foreground">
            Max ceiling: <strong>{ceiling} ft AGL</strong>
          </p>
          {grid?.laanc_eligible && (
            <Badge variant="secondary" className="text-xs">LAANC Eligible — Auto-approval available</Badge>
          )}
        </div>
      )}

      {/* No LAANC needed */}
      {!requiresLaanc && !isZeroGrid && (
        <div className="p-3 rounded-lg border bg-green-500/10 border-green-500/20 text-sm">
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            No LAANC Required
          </div>
          <p className="text-muted-foreground mt-1">
            {airspaceClass === 'G'
              ? 'Class G airspace — fly at or below 400 ft AGL per Part 107'
              : `Class ${airspaceClass} airspace — verify authorization requirements`}
          </p>
        </div>
      )}

      {/* TFR Alerts — enhanced with full detail and FAA links */}
      {(activeTfrs || []).length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Active TFR{(activeTfrs || []).length > 1 ? 's' : ''} Nearby</AlertTitle>
          <AlertDescription>
            <div className="space-y-3 mt-2">
              {(activeTfrs || []).map(tfr => {
                const tfrFull = tfr as typeof tfr & {
                  distance_nm: number;
                  tfr_type: string | null;
                  effective_start: string | null;
                  effective_end: string | null;
                  floor_ft: number | null;
                  ceiling_ft: number | null;
                  radius_nm: number | null;
                };

                return (
                  <div key={tfrFull.notam_number} className="text-sm border rounded-lg p-2 space-y-1 bg-background">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={tfrFull.status === 'active' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                          {tfrFull.status}
                        </Badge>
                        <span className="font-medium font-mono">{tfrFull.notam_number}</span>
                        {tfrFull.tfr_type && (
                          <Badge variant="outline" className="text-xs">{tfrFull.tfr_type}</Badge>
                        )}
                      </div>
                      <a
                        href={`https://tfr.faa.gov/tfr2/list.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary flex items-center gap-1 hover:underline shrink-0"
                      >
                        FAA <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {tfrFull.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{tfrFull.description}</p>
                    )}

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{tfrFull.distance_nm} NM away</span>
                      {tfrFull.radius_nm != null && (
                        <span>Radius: {tfrFull.radius_nm.toFixed(1)} NM</span>
                      )}
                      {tfrFull.floor_ft != null && tfrFull.ceiling_ft != null && (
                        <span>{tfrFull.floor_ft}–{tfrFull.ceiling_ft} ft MSL</span>
                      )}
                    </div>

                    {(tfrFull.effective_start || tfrFull.effective_end) && (
                      <div className="text-xs text-muted-foreground">
                        {tfrFull.effective_start && (
                          <span>From: {new Date(tfrFull.effective_start).toLocaleString()}</span>
                        )}
                        {tfrFull.effective_end && (
                          <span className="ml-2">Until: {new Date(tfrFull.effective_end).toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* TFR Data Freshness */}
      {tfrFreshness && (
        <div className={`p-3 rounded-lg border text-sm ${
          tfrFreshness.tier === 'fresh'
            ? 'bg-green-500/10 border-green-500/20'
            : tfrFreshness.tier === 'warning'
            ? 'bg-amber-500/10 border-amber-500/20'
            : tfrFreshness.tier === 'stale'
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-muted/50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <Clock className="h-4 w-4" />
              <span>TFR Data</span>
              <Badge
                variant="outline"
                className={
                  tfrFreshness.tier === 'fresh'
                    ? 'text-green-600 border-green-500'
                    : tfrFreshness.tier === 'warning'
                    ? 'text-amber-600 border-amber-500'
                    : 'text-red-600 border-red-500'
                }
              >
                {tfrFreshness.tier === 'fresh' && 'Current'}
                {tfrFreshness.tier === 'warning' && 'Aging'}
                {tfrFreshness.tier === 'stale' && 'Stale'}
                {tfrFreshness.tier === 'unknown' && 'Unknown'}
              </Badge>
            </div>
            <a
              href="https://tfr.faa.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
            >
              tfr.faa.gov <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {tfrFreshness.lastRefreshed ? (
            <p className="text-xs text-muted-foreground mt-1">
              Last refreshed:{' '}
              {tfrFreshness.ageMinutes != null
                ? tfrFreshness.ageMinutes < 1
                  ? 'just now'
                  : `${Math.round(tfrFreshness.ageMinutes)} min ago`
                : 'unknown'}
              {' '}({new Date(tfrFreshness.lastRefreshed).toLocaleTimeString()})
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No TFR data available</p>
          )}
          {tfrFreshness.tier === 'stale' && (
            <p className="text-xs text-red-600 font-medium mt-1">
              TFR data is over 1 hour old. Verify at tfr.faa.gov before flight.
            </p>
          )}
        </div>
      )}

      {/* Coordinates */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span>{latitude?.toFixed(4)}, {longitude?.toFixed(4)}</span>
      </div>

      {/* Confirm Button */}
      <Button
        onClick={handleConfirm}
        disabled={saveMutation.isPending}
        className="w-full"
      >
        {saveMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Confirm Airspace Check'
        )}
      </Button>
    </div>
  );
}
