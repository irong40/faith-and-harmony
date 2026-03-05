import { format } from 'date-fns';
import { Wind, Eye, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ForecastRow } from '@/hooks/useWeatherForecast';
import type { WeatherDetermination } from '@/types/weather';

const DETERMINATION_STYLES: Record<WeatherDetermination, { label: string; badge: string; row: string }> = {
  GO: { label: 'GO', badge: 'bg-green-600 text-white hover:bg-green-600', row: '' },
  CAUTION: { label: 'CAUTION', badge: 'bg-amber-500 text-white hover:bg-amber-500', row: 'bg-amber-50' },
  NO_GO: { label: 'NO GO', badge: 'bg-red-600 text-white hover:bg-red-600', row: 'bg-red-50' },
};

function formatValue(val: number | null, decimals: number): string {
  if (val == null) return '\u2014';
  return decimals === 0 ? Math.round(val).toString() : val.toFixed(decimals);
}

interface WeatherForecastGridProps {
  data: ForecastRow[];
}

export default function WeatherForecastGrid({ data }: WeatherForecastGridProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Time</TableHead>
            <TableHead>
              <span className="flex items-center gap-1">
                <Wind className="h-3.5 w-3.5" /> Wind (m/s)
              </span>
            </TableHead>
            <TableHead>
              <span className="flex items-center gap-1">
                <Wind className="h-3.5 w-3.5" /> Gust (m/s)
              </span>
            </TableHead>
            <TableHead>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Vis (SM)
              </span>
            </TableHead>
            <TableHead>
              <span className="flex items-center gap-1">
                <Cloud className="h-3.5 w-3.5" /> Ceiling (ft)
              </span>
            </TableHead>
            <TableHead>Precip (%)</TableHead>
            <TableHead>
              <span className="flex items-center gap-1">
                <Cloud className="h-3.5 w-3.5" /> Sky (%)
              </span>
            </TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const style = row.determination
              ? DETERMINATION_STYLES[row.determination]
              : null;

            return (
              <TableRow key={row.id} className={style?.row || ''}>
                <TableCell className="font-medium whitespace-nowrap">
                  {format(new Date(row.forecast_hour), 'EEE ha')}
                </TableCell>
                <TableCell>{formatValue(row.wind_speed_ms, 1)}</TableCell>
                <TableCell>{formatValue(row.wind_gust_ms, 1)}</TableCell>
                <TableCell>{formatValue(row.visibility_sm, 1)}</TableCell>
                <TableCell>{formatValue(row.cloud_ceiling_ft, 0)}</TableCell>
                <TableCell>{formatValue(row.precipitation_probability, 0)}</TableCell>
                <TableCell>{formatValue(row.sky_cover_pct, 0)}</TableCell>
                <TableCell className="text-center">
                  {style ? (
                    <Badge className={style.badge}>{style.label}</Badge>
                  ) : (
                    <span className="text-muted-foreground">{'\u2014'}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
