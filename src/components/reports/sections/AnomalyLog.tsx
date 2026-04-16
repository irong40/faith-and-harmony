import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { AnomalyEntry, AnomalyLogData, FindingSeverity, FindingReviewStatus, ReportImage } from '@/types/report';

interface Props {
  data: AnomalyLogData;
  onChange: (data: AnomalyLogData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const severityColors: Record<FindingSeverity, string> = {
  critical: REPORT_COLORS.badgeCritical, high: REPORT_COLORS.badgeHigh, medium: REPORT_COLORS.badgeMedium, low: REPORT_COLORS.badgeLow, info: REPORT_COLORS.badgeInfo,
};

const reviewColors: Record<FindingReviewStatus, string> = {
  pending: '#d97706', approved: '#16a34a', rejected: '#dc2626', modified: '#2563eb',
};

const emptyAnomaly = (): AnomalyEntry => ({
  id: crypto.randomUUID(), anomaly_type: '', severity: 'info', description: '', review_status: 'pending',
});

export function AnomalyLog({ data, onChange, mode }: Props) {
  const anomalies = data.anomalies ?? [];

  const update = (i: number, patch: Partial<AnomalyEntry>) => {
    const n = [...anomalies]; n[i] = { ...n[i], ...patch }; onChange({ ...data, anomalies: n });
  };

  const setReview = (i: number, status: FindingReviewStatus) => {
    update(i, { review_status: status, reviewer_notes: anomalies[i].reviewer_notes });
  };

  const pending = anomalies.filter(a => (a.review_status ?? 'pending') === 'pending').length;

  if (mode === 'edit') {
    return (
      <div className="space-y-4">
        <div><Label>Summary</Label><Textarea rows={2} value={data.summary ?? ''} onChange={(e) => onChange({ ...data, summary: e.target.value })} /></div>

        {anomalies.length > 0 && (
          <div className="flex items-center gap-4 p-3 rounded-lg border" style={{ background: '#f9f7f5' }}>
            <span className="text-sm font-medium">Review:</span>
            <span className="text-sm" style={{ color: '#d97706' }}>{pending} pending</span>
            <span className="text-sm" style={{ color: '#16a34a' }}>{anomalies.filter(a => a.review_status === 'approved').length} approved</span>
            {pending > 0 && (
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => {
                const updated = anomalies.map(a => (a.review_status ?? 'pending') === 'pending'
                  ? { ...a, review_status: 'approved' as FindingReviewStatus } : a
                );
                onChange({ ...data, anomalies: updated });
              }}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve All
              </Button>
            )}
          </div>
        )}

        {anomalies.map((a, i) => {
          const status = a.review_status ?? 'pending';
          return (
            <div key={a.id} className="border rounded-lg overflow-hidden" style={{ borderColor: status === 'rejected' ? '#fca5a5' : undefined }}>
              <div className="flex items-center justify-between px-3 py-1.5" style={{ background: status === 'approved' ? '#f0fdf4' : status === 'rejected' ? '#fef2f2' : '#fffbeb' }}>
                <div className="flex items-center gap-2">
                  {status === 'approved' ? <CheckCircle className="h-3.5 w-3.5" style={{ color: reviewColors[status] }} /> :
                   status === 'rejected' ? <XCircle className="h-3.5 w-3.5" style={{ color: reviewColors[status] }} /> :
                   <Clock className="h-3.5 w-3.5" style={{ color: reviewColors[status] }} />}
                  <span className="text-xs font-medium" style={{ color: reviewColors[status] }}>{status}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setReview(i, 'approved')} disabled={status === 'approved'}>
                    <CheckCircle className="h-3 w-3 mr-1" style={{ color: '#16a34a' }} /> OK
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setReview(i, 'rejected')} disabled={status === 'rejected'}>
                    <XCircle className="h-3 w-3 mr-1" style={{ color: '#dc2626' }} /> Reject
                  </Button>
                  <Button variant="destructive" size="sm" className="h-6 px-2 text-xs"
                    onClick={() => onChange({ ...data, anomalies: anomalies.filter((_, j) => j !== i) })}>Remove</Button>
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Type</Label><Input value={a.anomaly_type} onChange={(e) => update(i, { anomaly_type: e.target.value })} /></div>
                  <div><Label className="text-xs">Severity</Label>
                    <select className="w-full rounded border px-2 py-1.5 text-sm" value={a.severity} onChange={(e) => update(i, { severity: e.target.value as FindingSeverity })}>
                      {(['critical', 'high', 'medium', 'low', 'info'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div><Label className="text-xs">Timestamp</Label><Input value={a.timestamp ?? ''} onChange={(e) => update(i, { timestamp: e.target.value })} /></div>
                </div>
                <div><Label className="text-xs">Description</Label><Textarea rows={1} value={a.description} onChange={(e) => update(i, { description: e.target.value })} /></div>
                <div><Label className="text-xs">Reviewer Notes</Label><Input placeholder="Optional..." value={a.reviewer_notes ?? ''} onChange={(e) => update(i, { reviewer_notes: e.target.value })} /></div>
              </div>
            </div>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, anomalies: [...anomalies, emptyAnomaly()] })}>Add Anomaly</Button>
      </div>
    );
  }

  // Preview — only show approved/modified
  const visible = anomalies.filter(a => a.review_status === 'approved' || a.review_status === 'modified');

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Anomaly Log</h2>
      {data.summary && <p className="text-sm" style={{ color: REPORT_COLORS.textSecondary }}>{data.summary}</p>}
      {visible.length === 0 && anomalies.length > 0 && (
        <p className="text-sm italic" style={{ color: REPORT_COLORS.textMuted }}>
          {pending} anomal{pending !== 1 ? 'ies' : 'y'} pending review.
        </p>
      )}
      {visible.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow style={{ background: REPORT_COLORS.tableHeader }}>
              {['#', 'Type', 'Severity', 'Time', 'Description'].map((h) => (
                <TableHead key={h} style={{ color: REPORT_COLORS.tableHeaderText }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((a, i) => (
              <TableRow key={a.id} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{a.anomaly_type}</TableCell>
                <TableCell><Badge style={{ background: severityColors[a.severity], color: '#fff' }}>{a.severity}</Badge></TableCell>
                <TableCell className="text-xs">{a.timestamp}</TableCell>
                <TableCell className="text-xs">{a.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
