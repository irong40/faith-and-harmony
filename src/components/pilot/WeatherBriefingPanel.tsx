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
import { useWeatherThresholds, useMissionWeatherLog, useCreateWeatherBriefing } from '@/hooks/useWeatherBriefing';
import { evaluateWeather } from '@/lib/weather-evaluation';
import type { WeatherDetermination } from '@/types/weather';

interface WeatherBriefingPanelProps {
  missionId: string;
  aircraftModel: string | null;
  packageCode: string | null;
  latitude: number | null;
  longitude: number | null;
  nearestStation: string | null;
  onDetermination: (data: { id: string; determination: string; station: string }) => void;
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

  // Notify parent of saved log
  useEffect(() => {
    if (savedLog) {
      onDetermination({
        id: savedLog.id,
        determination: savedLog.determination,
        station: savedLog.metar_station || station,
      });
    }
  }, [savedLog]);

  const fetchMetar = async () => {
    setFetching(true);
    setBriefingResult(null);

    try {
      const url = `https://aviationweather.gov/api/data/metar?ids=${station}&format=json`;
      const response = await fetch(url);

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

  const parseOrNull = (v: string): number | null => {
    if (v.trim() === '') return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
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
      });

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
          <Button onClick={fetchMetar} disabled={fetching} className="w-full">
            {fetching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching METAR...
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
              <Button variant="ghost" onClick={() => setBriefingResult(null)} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Re-check Weather
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

/**
 * Extract cloud ceiling from METAR JSON response.
 * aviationweather.gov returns clouds as an array of { cover, base } objects.
 */
function extractCeiling(metar: any): number | null {
  const clouds = metar.clouds;
  if (!Array.isArray(clouds) || clouds.length === 0) return null;

  // Ceiling is the lowest BKN or OVC layer
  for (const layer of clouds) {
    if (['BKN', 'OVC'].includes(layer.cover)) {
      return layer.base ?? null;
    }
  }

  return null;
}
