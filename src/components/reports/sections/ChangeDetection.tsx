import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { ChangeDetectionData, ReportImage } from '@/types/report';

interface Props {
  data: ChangeDetectionData;
  onChange: (data: ChangeDetectionData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

export function ChangeDetection({ data, onChange, mode, images }: Props) {
  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div><Label>Description</Label><Textarea rows={3} value={data.description ?? ''} onChange={(e) => onChange({ ...data, description: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Comparison Date</Label><Input type="date" value={data.comparison_date ?? ''} onChange={(e) => onChange({ ...data, comparison_date: e.target.value })} /></div>
          <div><Label>Changes Found</Label><Input type="number" value={data.changes_found ?? ''} onChange={(e) => onChange({ ...data, changes_found: +e.target.value })} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Upload before/after images in the Report Builder (Phase 3).</p>
      </div>
    );
  }

  const imgs = images ?? [];
  const before = imgs.filter((_, i) => i % 2 === 0);
  const after = imgs.filter((_, i) => i % 2 === 1);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Change Detection</h2>
      {data.description && <p className="text-sm" style={{ color: REPORT_COLORS.textSecondary }}>{data.description}</p>}
      {data.comparison_date && <p className="text-sm" style={{ color: REPORT_COLORS.text }}>Comparison date: {data.comparison_date} | Changes detected: {data.changes_found ?? 0}</p>}
      {imgs.length >= 2 ? (
        <div className="space-y-4">
          {before.map((b, i) => (
            <div key={b.id} className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: REPORT_COLORS.textMuted }}>Before</p>
                <img src={b.image_url} alt={b.caption ?? 'Before'} className="w-full rounded" />
              </div>
              {after[i] && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: REPORT_COLORS.primary }}>After</p>
                  <img src={after[i].image_url} alt={after[i].caption ?? 'After'} className="w-full rounded" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed p-12 text-center text-sm" style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.textMuted }}>No before/after images attached</div>
      )}
    </div>
  );
}
