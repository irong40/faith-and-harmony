import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REPORT_COLORS } from '@/lib/brand';
import type { DeliverableEntry, DeliverablesManifestData, ReportImage } from '@/types/report';

interface Props {
  data: DeliverablesManifestData;
  onChange: (data: DeliverablesManifestData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const emptyDeliverable = (): DeliverableEntry => ({ filename: '', type: 'Photo' });

export function DeliverablesManifest({ data, onChange, mode }: Props) {
  const deliverables = data.deliverables ?? [];

  const update = (i: number, patch: Partial<DeliverableEntry>) => {
    const n = [...deliverables]; n[i] = { ...n[i], ...patch }; onChange({ ...data, deliverables: n });
  };

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Delivery Method</Label><Input value={data.delivery_method ?? ''} onChange={(e) => onChange({ ...data, delivery_method: e.target.value })} /></div>
          <div><Label>Download Link</Label><Input value={data.download_link ?? ''} onChange={(e) => onChange({ ...data, download_link: e.target.value })} /></div>
        </div>
        {deliverables.map((d, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Filename</Label><Input value={d.filename} onChange={(e) => update(i, { filename: e.target.value })} /></div>
            <div className="w-32"><Label className="text-xs">Type</Label><Input value={d.type} onChange={(e) => update(i, { type: e.target.value })} /></div>
            <div className="w-24"><Label className="text-xs">Size</Label><Input value={d.file_size ?? ''} onChange={(e) => update(i, { file_size: e.target.value })} /></div>
            <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, deliverables: deliverables.filter((_, j) => j !== i) })}>Remove</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, deliverables: [...deliverables, emptyDeliverable()] })}>Add Deliverable</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Deliverables</h2>
      <Table>
        <TableHeader>
          <TableRow style={{ background: REPORT_COLORS.tableHeader }}>
            {['Filename', 'Type', 'Size', 'Link'].map((h) => (
              <TableHead key={h} style={{ color: REPORT_COLORS.tableHeaderText }}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliverables.map((d, i) => (
            <TableRow key={i} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
              <TableCell className="font-medium">{d.filename}</TableCell>
              <TableCell>{d.type}</TableCell>
              <TableCell>{d.file_size ?? '---'}</TableCell>
              <TableCell>{d.download_url ? <a href={d.download_url} target="_blank" rel="noreferrer" style={{ color: REPORT_COLORS.primary }}>Download</a> : '---'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.delivery_method && <p className="text-xs" style={{ color: REPORT_COLORS.textSecondary }}>Delivery: {data.delivery_method}</p>}
      {data.expires_at && <p className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>Links expire: {data.expires_at}</p>}
    </div>
  );
}
