import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Cloud, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AdminNav from './components/AdminNav';
import WeatherForecastGrid from './components/WeatherForecastGrid';
import { useWeatherForecast, useWeatherHeldJobs } from '@/hooks/useWeatherForecast';
import type { ForecastRow } from '@/hooks/useWeatherForecast';
import type { WeatherDetermination } from '@/types/weather';

function worstDetermination(rows: ForecastRow[]): WeatherDetermination | null {
  if (rows.length === 0) return null;
  if (rows.some((r) => r.determination === 'NO_GO')) return 'NO_GO';
  if (rows.some((r) => r.determination === 'CAUTION')) return 'CAUTION';
  if (rows.some((r) => r.determination === 'GO')) return 'GO';
  return null;
}

function determinationCounts(rows: ForecastRow[]) {
  let go = 0;
  let caution = 0;
  let noGo = 0;
  for (const r of rows) {
    if (r.determination === 'GO') go++;
    else if (r.determination === 'CAUTION') caution++;
    else if (r.determination === 'NO_GO') noGo++;
  }
  return { go, caution, noGo };
}

const WORST_COLOR: Record<WeatherDetermination, string> = {
  GO: 'text-green-600',
  CAUTION: 'text-amber-500',
  NO_GO: 'text-red-600',
};

export default function WeatherOperations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: forecast, isLoading: forecastLoading } = useWeatherForecast();
  const { data: heldJobs, isLoading: heldJobsLoading } = useWeatherHeldJobs();
  const [refreshing, setRefreshing] = useState(false);

  const forecastRows = forecast || [];
  const next12 = forecastRows.slice(0, 12);
  const next24 = forecastRows.slice(0, 24);
  const counts12 = determinationCounts(next12);
  const counts24 = determinationCounts(next24);
  const worst12 = worstDetermination(next12);
  const worst24 = worstDetermination(next24);
  const heldJobCount = heldJobs?.length ?? 0;

  const lastFetched = forecastRows.length > 0 && forecastRows[0].fetched_at
    ? format(new Date(forecastRows[0].fetched_at), 'MMM d, h:mm a')
    : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('weather-forecast-fetch', { body: {} });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['weather-forecast'] });
      await queryClient.invalidateQueries({ queryKey: ['weather-held-jobs'] });
      toast({ title: 'Forecast refreshed' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Refresh failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Cloud className="h-8 w-8" />
              Weather Operations
            </h1>
            <p className="text-muted-foreground mt-1">
              {lastFetched
                ? `Last fetched ${lastFetched}`
                : 'No forecast data'}
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Forecast
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Next 12 Hours</CardTitle>
            </CardHeader>
            <CardContent>
              {forecastLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : next12.length === 0 ? (
                <span className="text-muted-foreground text-sm">No data</span>
              ) : (
                <div className={`text-lg font-semibold ${worst12 ? WORST_COLOR[worst12] : ''}`}>
                  <span className="text-green-600">{counts12.go} GO</span>
                  {counts12.caution > 0 && <span className="text-amber-500 ml-2">{counts12.caution} CAUTION</span>}
                  {counts12.noGo > 0 && <span className="text-red-600 ml-2">{counts12.noGo} NO GO</span>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Next 24 Hours</CardTitle>
            </CardHeader>
            <CardContent>
              {forecastLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : next24.length === 0 ? (
                <span className="text-muted-foreground text-sm">No data</span>
              ) : (
                <div className={`text-lg font-semibold ${worst24 ? WORST_COLOR[worst24] : ''}`}>
                  <span className="text-green-600">{counts24.go} GO</span>
                  {counts24.caution > 0 && <span className="text-amber-500 ml-2">{counts24.caution} CAUTION</span>}
                  {counts24.noGo > 0 && <span className="text-red-600 ml-2">{counts24.noGo} NO GO</span>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Jobs at Risk</CardTitle>
            </CardHeader>
            <CardContent>
              {heldJobsLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className={`text-2xl font-bold ${heldJobCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {heldJobCount}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Flagged Jobs Section */}
        {heldJobCount > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Flagged Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(heldJobs || []).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="min-w-0">
                      <Link
                        to={`/admin/drone-jobs/${job.id}`}
                        className="font-mono text-sm font-semibold hover:underline text-primary"
                      >
                        {job.job_number}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {job.scheduled_date || 'Unscheduled'}
                        {job.scheduled_time ? ` at ${job.scheduled_time.slice(0, 5)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                        Weather Hold
                      </Badge>
                      {job.weather_hold_reasons && job.weather_hold_reasons.length > 0 && (
                        <span className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {job.weather_hold_reasons.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forecast Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              48 Hour Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            {forecastLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : forecastRows.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">
                No forecast data available. Click Refresh to fetch.
              </p>
            ) : (
              <WeatherForecastGrid data={forecastRows} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
