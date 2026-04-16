import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { TransectMapData, ReportImage } from '@/types/report';

interface Props {
  data: TransectMapData;
  onChange: (data: TransectMapData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function TransectMap({ data, onChange, mode, images }: Props) {
  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div><Label>Description</Label><Textarea rows={3} value={data.description ?? ''} onChange={(e) => onChange({ ...data, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Total Transect (km)</Label><Input type="number" step="0.1" value={data.total_transect_km ?? ''} onChange={(e) => onChange({ ...data, total_transect_km: +e.target.value })} /></div>
          <div><Label>Area Covered (acres)</Label><Input type="number" value={data.area_covered_acres ?? ''} onChange={(e) => onChange({ ...data, area_covered_acres: +e.target.value })} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Upload images in the Report Builder (Phase 3).</p>
      </div>
    );
  }

  const imgs = images ?? [];

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Transect Map</h2>
      {data.description && <p className="text-sm" style={{ color: REPORT_COLORS.textSecondary }}>{data.description}</p>}
      {imgs.length > 0 ? (
        <div className="relative">
          <img src={imgs[0].image_url} alt={imgs[0].caption ?? 'Transect map'} className="w-full rounded" />
          {imgs[0].caption && <p className="text-xs text-center mt-1" style={{ color: REPORT_COLORS.textMuted }}>{imgs[0].caption}</p>}
        </div>
      ) : (
        <div className="rounded border border-dashed p-12 text-center text-sm" style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.textMuted }}>No transect map attached</div>
      )}
      <div className="flex gap-4 text-sm" style={{ color: REPORT_COLORS.text }}>
        {data.total_transect_km != null && <span>Transect: {data.total_transect_km} km</span>}
        {data.area_covered_acres != null && <span>Area: {data.area_covered_acres} acres</span>}
      </div>
    </div>
  );
}
