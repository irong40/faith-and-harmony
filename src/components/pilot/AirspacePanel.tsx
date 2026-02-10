import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle, CheckCircle2, MapPin, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  useNearestAirspace,
  useActiveTfrs,
  useMissionAuthorization,
  useSaveMissionAuthorization,
} from '@/hooks/useAirspaceAuth';
import type { TfrSummary } from '@/types/authorization';

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

  const { data: nearestAirspace, isLoading: loadingAirspace } = useNearestAirspace(latitude, longitude);
  const { data: activeTfrs, isLoading: loadingTfrs } = useActiveTfrs(latitude, longitude);
  const { data: savedAuth, isLoading: loadingSaved } = useMissionAuthorization(missionId);
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

      {/* TFR Alerts */}
      {tfrSummaries.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle>Active TFR{tfrSummaries.length > 1 ? 's' : ''} Nearby</AlertTitle>
          <AlertDescription>
            <div className="space-y-2 mt-2">
              {tfrSummaries.map(tfr => (
                <div key={tfr.notam_number} className="text-sm flex items-start gap-2">
                  <Badge variant={tfr.status === 'active' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                    {tfr.status}
                  </Badge>
                  <div>
                    <span className="font-medium">{tfr.notam_number}</span>
                    {tfr.description && <span className="text-muted-foreground"> — {tfr.description}</span>}
                    <span className="text-muted-foreground"> ({tfr.distance_nm} NM)</span>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
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
