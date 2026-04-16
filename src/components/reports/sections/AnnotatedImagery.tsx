import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { AnnotatedImageryData, ReportImage } from '@/types/report';

interface Props {
  data: AnnotatedImageryData;
  onChange: (data: AnnotatedImageryData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function AnnotatedImagery({ data, onChange, mode, images }: Props) {
  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div><Label>Description</Label><Textarea rows={3} value={data.description ?? ''} onChange={(e) => onChange({ ...data, description: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">Upload images in the Report Builder (Phase 3).</p>
      </div>
    );
  }

  const imgs = images ?? [];

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Annotated Imagery</h2>
      {data.description && <p className="text-sm" style={{ color: REPORT_COLORS.textSecondary }}>{data.description}</p>}
      {imgs.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {imgs.map((img) => (
            <div key={img.id} className="rounded overflow-hidden" style={{ border: `1px solid ${REPORT_COLORS.border}` }}>
              <img src={img.image_url} alt={img.caption ?? 'Annotated image'} className="w-full object-cover" />
              {img.caption && <p className="text-xs p-2 text-center" style={{ background: REPORT_COLORS.bgCard, color: REPORT_COLORS.textMuted }}>{img.caption}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed p-12 text-center text-sm" style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.textMuted }}>No annotated images attached</div>
      )}
    </div>
  );
}
