import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SignedImage } from '@/components/reports/SignedImage';
import { REPORT_COLORS } from '@/lib/brand';
import { useRenderableReportImages } from '@/lib/reportImages';
import type { DetectionHeatmapData, ReportImage } from '@/types/report';

interface Props {
  data: DetectionHeatmapData;
  onChange: (data: DetectionHeatmapData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function DetectionHeatmap({ data, onChange, mode, images }: Props) {
  // Signed-URL resolution: failed images drop out so they behave as missing.
  const imgs = useRenderableReportImages(images);

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div><Label>Description</Label><Textarea rows={3} value={data.description ?? ''} onChange={(e) => onChange({ ...data, description: e.target.value })} /></div>
        <div><Label>Legend</Label><Textarea rows={2} value={data.legend ?? ''} onChange={(e) => onChange({ ...data, legend: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">Upload images in the Report Builder (Phase 3).</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Detection Heatmap</h2>
      {data.description && <p className="text-sm" style={{ color: REPORT_COLORS.textSecondary }}>{data.description}</p>}
      {imgs.length > 0 ? (
        <div className="space-y-2">
          {imgs.map((img) => (
            <div key={img.id}>
              <SignedImage value={img.image_url} alt={img.caption ?? 'Heatmap'} className="w-full rounded" />
              {img.caption && <p className="text-xs text-center mt-1" style={{ color: REPORT_COLORS.textMuted }}>{img.caption}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed p-12 text-center text-sm" style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.textMuted }}>No heatmap images attached</div>
      )}
      {data.legend && <p className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>Legend: {data.legend}</p>}
    </div>
  );
}
