import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2, Cloud, Wind, Eye, Thermometer, Gauge,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useWeatherThresholds, useMissionWeatherLog, useCreateWeatherBriefing } from '@/hooks/useWeatherBriefing';
import { evaluateWeather } from '@/lib/weather-evaluation';
import { parseOrNull, extractCeiling } from '@/lib/metar-utils';
import type { WeatherDetermination } from '@/types/weather';
import MetarAgeIndicator from './MetarAgeIndicator';
import { logWeatherBriefing, logWeatherRefresh } from '@/lib/safety-audit';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface WeatherBriefingPanelProps {
  missionId: string;
  aircraftModel: string | null;
  packageCode: string | null;
  latitude: number | null;
  longitude: number | null;
  nearestStation: string | null;
  onDetermination: (data: { id: string; determination: string; station: string; briefing_timestamp: string }) => void;
}

const DETERMINATION_CONFIG: Record<WeatherDetermination, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  GO: { label: 'GO', color: 'bg-green-600 text-white', icon: CheckCircle2 },
  CAUTION: { label: 'CAUTION', color: 'bg-amber-500 text-white', icon: AlertTriangle },
  NO_GO: { label: 'NO GO', color: 'bg-red-600 text-white', icon: XCircle },
};

interface ManualWeatherForm {
  wind_speed_ms: string;
  wind_gust_ms: string;
  visibility_sm: string;
  cloud_ceiling_ft: string;
  temperature_c: string;
}

export default function WeatherBriefingPanel({
  missionId,
  aircraftModel,
  packageCode,
  latitude,
  longitude,
  nearestStation,
  onDetermination,
}: WeatherBriefingPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const station = nearestStation || 'KORF'; // Default to Norfolk
  const { data: thresholds } = useWeatherThresholds(aircraftModel, packageCode);
  const { data: savedLog } = useMissionWeatherLog(missionId);
  const createBriefing = useCreateWeatherBriefing();

  const [fetching, setFetching] = useState(false);
  const [briefingResult, setBriefingResult] = useState<{
    determination: WeatherDetermination;
    reasons: string[];
    metrics: Record<string, number | null>;
    metar_raw: string | null;
  } | null>(null);

  // Rate limit: track last fetch time; disable refresh for 60s after fetch
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);

  // Countdown for rate limit
  useEffect(() => {
    if (!lastFetchedAt) return;
    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastFetchedAt) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      setRateLimitSecondsLeft(Math.ceil(remaining));
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastFetchedAt]);

  // Manual entry state
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState<ManualWeatherForm>({
    wind_speed_ms: '',
    wind_gust_ms: '',
    visibility_sm: '',
    cloud_ceiling_ft: '',
    temperature_c: '',
  });

  // Override state
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Re-render ticker for stale detection (updates every 30 seconds)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  /** Returns age of the saved briefing in minutes, or null if not saved */
  const savedBriefingAgeMinutes = savedLog
    ? (Date.now() - new Date(savedLog.briefing_timestamp).getTime()) / 60_000
    : null;

  /** METAR is stale (> 30 min) — blocks checklist advancement */
  const isMetarStale = savedBriefingAgeMinutes != null && savedBriefingAgeMinutes > 30;

  /** METAR is in caution zone (15-30 min) — warn but allow proceed */
  const isMetarCaution = savedBriefingAgeMinutes != null
    && savedBriefingAgeMinutes >= 15
    && savedBriefingAgeMinutes <= 30;

  // Notify parent of saved log
  useEffect(() => {
    if (savedLog) {
      onDetermination({
        id: savedLog.id,
        determination: savedLog.determination,
        station: savedLog.metar_station || station,
        briefing_timestamp: savedLog.briefing_timestamp,
      });
    }
  }, [savedLog]);

  const fetchMetar = async () => {
    setFetching(true);
    setBriefingResult(null);
    setLastFetchedAt(Date.now());
    setRateLimitSecondsLeft(60);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/metar-proxy?station=${station}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error(`METAR fetch failed: ${response.status}`);

      const data = await response.json();
      if (!data?.length) throw new Error('No METAR data returned');

      const metar = data[0];
      const metrics = {
        wind_speed_ms: metar.wspd != null ? metar.wspd * 0.51444 : null, // knots → m/s
        wind_gust_ms: metar.wgst != null ? metar.wgst * 0.51444 : null,
        wind_direction_deg: metar.wdir ?? null,
        visibility_sm: metar.visib ?? null,
        cloud_ceiling_ft: extractCeiling(metar),
        temperature_c: metar.temp ?? null,
        dewpoint_c: metar.dewp ?? null,
        altimeter_inhg: metar.altim != null ? metar.altim * 0.02953 : null, // hPa → inHg
        precipitation_probability: null,
        kp_index: null,
      };

      const evaluation = evaluateWeather(metrics, thresholds || []);

      setBriefingResult({
        determination: evaluation.determination,
        reasons: evaluation.reasons,
        metrics,
        metar_raw: metar.rawOb || null,
      });
    } catch (error: any) {
      toast({
        title: 'Weather fetch failed',
        description: `${error.message}. Use manual entry instead.`,
        variant: 'destructive',
      });
      setShowManual(true);
    } finally {
      setFetching(false);
    }
  };

  const handleManualEvaluate = () => {
    const metrics = {
      wind_speed_ms: parseOrNull(manualForm.wind_speed_ms),
      wind_gust_ms: parseOrNull(manualForm.wind_gust_ms),
      visibility_sm: parseOrNull(manualForm.visibility_sm),
      cloud_ceiling_ft: parseOrNull(manualForm.cloud_ceiling_ft),
      temperature_c: parseOrNull(manualForm.temperature_c),
      wind_direction_deg: null,
      dewpoint_c: null,
      altimeter_inhg: null,
      precipitation_probability: null,
      kp_index: null,
    };

    const evaluation = evaluateWeather(metrics, thresholds || []);

    setBriefingResult({
      determination: evaluation.determination,
      reasons: evaluation.reasons,
      metrics,
      metar_raw: null,
    });
  };

  const handleSave = async (pilotOverride = false) => {
    if (!briefingResult) return;

    try {
      const result = await createBriefing.mutateAsync({
        mission_id: missionId,
        metar_station: station,
        metar_raw: briefingResult.metar_raw,
        wind_speed_ms: briefingResult.metrics.wind_speed_ms ?? null,
        wind_gust_ms: briefingResult.metrics.wind_gust_ms ?? null,
        wind_direction_deg: briefingResult.metrics.wind_direction_deg ?? null,
        visibility_sm: briefingResult.metrics.visibility_sm ?? null,
        cloud_ceiling_ft: briefingResult.metrics.cloud_ceiling_ft ?? null,
        temperature_c: briefingResult.metrics.temperature_c ?? null,
        dewpoint_c: briefingResult.metrics.dewpoint_c ?? null,
        altimeter_inhg: briefingResult.metrics.altimeter_inhg ?? null,
        precipitation_probability: briefingResult.metrics.precipitation_probability ?? null,
        kp_index: briefingResult.metrics.kp_index ?? null,
        determination: briefingResult.determination,
        determination_reasons: briefingResult.reasons,
        pilot_override: pilotOverride,
        override_reason: pilotOverride ? overrideReason : null,
      });

      onDetermination({
        id: result.id,
        determination: result.determination,
        station,
        briefing_timestamp: result.briefing_timestamp,
      });

      // Safety audit: log weather briefing (or override)
      if (user) {
        void logWeatherBriefing(missionId, user.id, {
          determination: result.determination,
          station,
          isOverride: pilotOverride,
          overrideReason: pilotOverride ? overrideReason : null,
        });
      }

      toast({ title: 'Weather briefing saved' });
    } catch (error: any) {
      toast({
        title: 'Error saving weather briefing',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Already have a saved briefing
  if (savedLog && !createBriefing.isPending) {
    const config = DETERMINATION_CONFIG[savedLog.determination];
    const Icon = config.icon;

    return (
      <div className="space-y-3">
        {/* METAR age indicator — prominent in header */}
        <MetarAgeIndicator observationTime={savedLog.briefing_timestamp} />

        {/* Stale gate: block advancement when > 30 min */}
        {isMetarStale && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Weather Data Stale</AlertTitle>
            <AlertDescription>
              Weather data is over 30 minutes old. Refresh required before proceeding.
            </AlertDescription>
          </Alert>
        )}

        {/* Caution: 15-30 min — warn but allow */}
        {isMetarCaution && !isMetarStale && (
          <Alert>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle>Weather Data Aging</AlertTitle>
            <AlertDescription>
              Weather is {Math.round(savedBriefingAgeMinutes!)} minutes old. Consider refreshing before flight.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-3">
          <Badge className={`text-lg px-3 py-1 ${config.color}`}>
            {config.label}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {savedLog.metar_station} — {new Date(savedLog.briefing_timestamp).toLocaleTimeString()}
          </span>
        </div>
        {savedLog.pilot_override && (
          <Badge variant="outline" className="text-amber-600 border-amber-300">
            Pilot Override: {savedLog.override_reason}
          </Badge>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {savedLog.wind_speed_ms != null && (
            <div className="flex items-center gap-1">
              <Wind className="h-3 w-3 text-muted-foreground" />
              <span>{savedLog.wind_speed_ms.toFixed(1)} m/s</span>
              {savedLog.wind_gust_ms != null && (
                <span className="text-muted-foreground">G{savedLog.wind_gust_ms.toFixed(1)}</span>
              )}
            </div>
          )}
          {savedLog.visibility_sm != null && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <span>{savedLog.visibility_sm} SM</span>
            </div>
          )}
          {savedLog.temperature_c != null && (
            <div className="flex items-center gap-1">
              <Thermometer className="h-3 w-3 text-muted-foreground" />
              <span>{savedLog.temperature_c}°C</span>
            </div>
          )}
          {savedLog.cloud_ceiling_ft != null && (
            <div className="flex items-center gap-1">
              <Cloud className="h-3 w-3 text-muted-foreground" />
              <span>{savedLog.cloud_ceiling_ft} ft</span>
            </div>
          )}
        </div>

        {/* Refresh Weather button — always available, required when stale */}
        <Button
          variant={isMetarStale ? 'default' : 'outline'}
          size="sm"
          className="w-full"
          onClick={() => {
            // Safety audit: log weather refresh
            if (user && savedBriefingAgeMinutes != null) {
              void logWeatherRefresh(missionId, user.id, {
                station: savedLog.metar_station || station,
                previousAgeMinutes: savedBriefingAgeMinutes,
              });
            }
            // Invalidate saved log so WeatherBriefingPanel resets to fetch mode
            queryClient.removeQueries({ queryKey: ['mission-weather-log', missionId] });
          }}
        >
          <RefreshCw className="mr-2 h-3 w-3" />
          {isMetarStale ? 'Refresh Weather (Required)' : 'Re-check Weather'}
        </Button>
      </div>
    );
  }

  // No aircraft selected
  if (!aircraftModel) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Equipment Required</AlertTitle>
        <AlertDescription>
          Select aircraft equipment first — weather thresholds depend on the aircraft model.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Fetch Button */}
      {!briefingResult && !showManual && (
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Station: <strong>{station}</strong>
            {aircraftModel && <> — Aircraft: <strong>{aircraftModel}</strong></>}
          </div>
          <Button
            onClick={fetchMetar}
            disabled={fetching || rateLimitSecondsLeft > 0}
            className="w-full"
          >
            {fetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching METAR...
              </>
            ) : rateLimitSecondsLeft > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh available in {rateLimitSecondsLeft}s
              </>
            ) : (
              <>
                <Cloud className="mr-2 h-4 w-4" />
                Get Weather Briefing
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowManual(true)} className="w-full">
            Enter weather manually
          </Button>
        </div>
      )}

      {/* Manual Entry Form */}
      {showManual && !briefingResult && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Manual Weather Entry</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Wind Speed (m/s)</Label>
              <Input
                type="number"
                step="0.1"
                value={manualForm.wind_speed_ms}
                onChange={e => setManualForm(f => ({ ...f, wind_speed_ms: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Wind Gust (m/s)</Label>
              <Input
                type="number"
                step="0.1"
                value={manualForm.wind_gust_ms}
                onChange={e => setManualForm(f => ({ ...f, wind_gust_ms: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Visibility (SM)</Label>
              <Input
                type="number"
                step="0.5"
                value={manualForm.visibility_sm}
                onChange={e => setManualForm(f => ({ ...f, visibility_sm: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Cloud Ceiling (ft)</Label>
              <Input
                type="number"
                value={manualForm.cloud_ceiling_ft}
                onChange={e => setManualForm(f => ({ ...f, cloud_ceiling_ft: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Temperature (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={manualForm.temperature_c}
                onChange={e => setManualForm(f => ({ ...f, temperature_c: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleManualEvaluate} className="flex-1">Evaluate</Button>
            <Button variant="ghost" onClick={() => setShowManual(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Briefing Result */}
      {briefingResult && (
        <div className="space-y-4">
          {/* Determination Badge */}
          {(() => {
            const config = DETERMINATION_CONFIG[briefingResult.determination];
            const Icon = config.icon;
            return (
              <div className="flex items-center gap-3">
                <Badge className={`text-xl px-4 py-2 ${config.color}`}>
                  <Icon className="mr-2 h-5 w-5" />
                  {config.label}
                </Badge>
              </div>
            );
          })()}

          {/* Raw METAR */}
          {briefingResult.metar_raw && (
            <div className="p-2 rounded bg-muted font-mono text-xs break-all">
              {briefingResult.metar_raw}
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {briefingResult.metrics.wind_speed_ms != null && (
              <div className="flex items-center gap-2 p-2 rounded border">
                <Wind className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{briefingResult.metrics.wind_speed_ms.toFixed(1)} m/s</div>
                  <div className="text-xs text-muted-foreground">Wind</div>
                </div>
              </div>
            )}
            {briefingResult.metrics.visibility_sm != null && (
              <div className="flex items-center gap-2 p-2 rounded border">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{briefingResult.metrics.visibility_sm} SM</div>
                  <div className="text-xs text-muted-foreground">Visibility</div>
                </div>
              </div>
            )}
            {briefingResult.metrics.temperature_c != null && (
              <div className="flex items-center gap-2 p-2 rounded border">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{briefingResult.metrics.temperature_c}°C</div>
                  <div className="text-xs text-muted-foreground">Temperature</div>
                </div>
              </div>
            )}
            {briefingResult.metrics.cloud_ceiling_ft != null && (
              <div className="flex items-center gap-2 p-2 rounded border">
                <Cloud className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{briefingResult.metrics.cloud_ceiling_ft} ft</div>
                  <div className="text-xs text-muted-foreground">Ceiling</div>
                </div>
              </div>
            )}
          </div>

          {/* Reasons */}
          <div className="space-y-1">
            {briefingResult.reasons.map((reason, i) => (
              <div key={i} className="text-sm flex items-start gap-2">
                <span className="text-muted-foreground">{i + 1}.</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Actions */}
          {briefingResult.determination === 'NO_GO' && !showOverride ? (
            <div className="space-y-2">
              <Button
                variant="destructive"
                onClick={() => setShowOverride(true)}
                className="w-full"
              >
                Override NO GO (Requires Reason)
              </Button>
              <Button
                variant="ghost"
                onClick={() => setBriefingResult(null)}
                disabled={rateLimitSecondsLeft > 0}
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {rateLimitSecondsLeft > 0
                  ? `Re-check available in ${rateLimitSecondsLeft}s`
                  : 'Re-check Weather'}
              </Button>
            </div>
          ) : briefingResult.determination === 'NO_GO' && showOverride ? (
            <div className="space-y-3">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>NO GO Override</AlertTitle>
                <AlertDescription>
                  You are overriding a NO GO determination. Provide a reason for the override.
                  This will be logged in the flight record.
                </AlertDescription>
              </Alert>
              <Textarea
                placeholder="Reason for override (e.g., conditions improving, short flight, sheltered area)..."
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
              />
              <Button
                variant="destructive"
                onClick={() => handleSave(true)}
                disabled={!overrideReason.trim() || createBriefing.isPending}
                className="w-full"
              >
                {createBriefing.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm Override & Save
              </Button>
              <Button variant="ghost" onClick={() => setShowOverride(false)} className="w-full">
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleSave(false)}
              disabled={createBriefing.isPending}
              className="w-full"
            >
              {createBriefing.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Accept & Save Briefing'
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

