import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import { CheckCircle, XCircle, AlertCircle, Clock, Pencil } from 'lucide-react';
import type { Finding, FindingsData, FindingSeverity, FindingReviewStatus, ReportImage } from '@/types/report';

interface Props {
  data: FindingsData;
  onChange: (data: FindingsData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const severityColors: Record<FindingSeverity, string> = {
  critical: REPORT_COLORS.badgeCritical, high: REPORT_COLORS.badgeHigh, medium: REPORT_COLORS.badgeMedium, low: REPORT_COLORS.badgeLow, info: REPORT_COLORS.badgeInfo,
};

const reviewStatusConfig: Record<FindingReviewStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending Review', color: '#d97706', bg: '#fffbeb', icon: Clock },
  approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
  modified: { label: 'Modified', color: '#2563eb', bg: '#eff6ff', icon: Pencil },
};

const emptyFinding = (): Finding => ({
  id: crypto.randomUUID(), severity: 'info', title: '', description: '', review_status: 'pending',
});

export function Findings({ data, onChange, mode }: Props) {
  const findings = data.findings ?? [];

  const update = (i: number, patch: Partial<Finding>) => {
    const n = [...findings]; n[i] = { ...n[i], ...patch }; onChange({ ...data, findings: n });
  };

  const setReview = (i: number, status: FindingReviewStatus) => {
    update(i, {
      review_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'Adam Pierce',
    });
  };

  // Count review stats
  const pending = findings.filter(f => (f.review_status ?? 'pending') === 'pending').length;
  const approved = findings.filter(f => f.review_status === 'approved').length;
  const rejected = findings.filter(f => f.review_status === 'rejected').length;

  if (mode === 'edit') {
    return (
      <div className="space-y-4">
        <div><Label>Summary</Label><Textarea rows={2} value={data.summary ?? ''} onChange={(e) => onChange({ ...data, summary: e.target.value })} /></div>

        {/* Review status bar */}
        {findings.length > 0 && (
          <div className="flex items-center gap-4 p-3 rounded-lg border" style={{ background: '#f9f7f5' }}>
            <span className="text-sm font-medium">Review Status:</span>
            <span className="text-sm" style={{ color: '#d97706' }}>{pending} pending</span>
            <span className="text-sm" style={{ color: '#16a34a' }}>{approved} approved</span>
            {rejected > 0 && <span className="text-sm" style={{ color: '#dc2626' }}>{rejected} rejected</span>}
            {pending > 0 && (
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => {
                const updated = findings.map(f => (f.review_status ?? 'pending') === 'pending'
                  ? { ...f, review_status: 'approved' as FindingReviewStatus, reviewed_at: new Date().toISOString(), reviewed_by: 'Adam Pierce' }
                  : f
                );
                onChange({ ...data, findings: updated });
              }}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve All Pending
              </Button>
            )}
          </div>
        )}

        {findings.map((f, i) => {
          const status = f.review_status ?? 'pending';
          const config = reviewStatusConfig[status];
          const StatusIcon = config.icon;

          return (
            <div key={f.id} className="border rounded-lg overflow-hidden" style={{ borderColor: status === 'rejected' ? '#fca5a5' : undefined }}>
              {/* Review header */}
              <div className="flex items-center justify-between px-3 py-2" style={{ background: config.bg }}>
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4" style={{ color: config.color }} />
                  <span className="text-xs font-medium" style={{ color: config.color }}>{config.label}</span>
                  {f.reviewed_at && <span className="text-xs" style={{ color: '#999' }}>({new Date(f.reviewed_at).toLocaleDateString()})</span>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" style={{ color: '#16a34a' }}
                    onClick={() => setReview(i, 'approved')} disabled={status === 'approved'}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" style={{ color: '#dc2626' }}
                    onClick={() => setReview(i, 'rejected')} disabled={status === 'rejected'}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                  <Button variant="destructive" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => onChange({ ...data, findings: findings.filter((_, j) => j !== i) })}>Remove</Button>
                </div>
              </div>

              {/* Finding content */}
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Title</Label><Input value={f.title} onChange={(e) => { update(i, { title: e.target.value, review_status: status === 'approved' ? 'modified' : status }); }} /></div>
                  <div>
                    <Label className="text-xs">Severity</Label>
                    <select className="w-full rounded border px-2 py-1.5 text-sm" value={f.severity} onChange={(e) => update(i, { severity: e.target.value as FindingSeverity })}>
                      {(['critical', 'high', 'medium', 'low', 'info'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div><Label className="text-xs">Description</Label><Textarea rows={2} value={f.description} onChange={(e) => { update(i, { description: e.target.value, review_status: status === 'approved' ? 'modified' : status }); }} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Location</Label><Input value={f.location ?? ''} onChange={(e) => update(i, { location: e.target.value })} /></div>
                  <div><Label className="text-xs">Recommendation</Label><Input value={f.recommendation ?? ''} onChange={(e) => { update(i, { recommendation: e.target.value, review_status: status === 'approved' ? 'modified' : status }); }} /></div>
                </div>
                <div><Label className="text-xs">Reviewer Notes</Label><Input placeholder="Optional notes about this finding..." value={f.reviewer_notes ?? ''} onChange={(e) => update(i, { reviewer_notes: e.target.value })} /></div>
              </div>
            </div>
          );
        })}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, findings: [...findings, emptyFinding()] })}>Add Finding</Button>
      </div>
    );
  }

  // Preview mode — only show approved and modified findings
  const visibleFindings = findings.filter(f => f.review_status === 'approved' || f.review_status === 'modified');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Findings</h2>
      {data.summary && <p className="text-sm" style={{ color: REPORT_COLORS.textSecondary }}>{data.summary}</p>}
      {visibleFindings.length === 0 && findings.length > 0 && (
        <p className="text-sm italic" style={{ color: REPORT_COLORS.textMuted }}>
          {pending} finding{pending !== 1 ? 's' : ''} pending review. Approve findings to include them in the report.
        </p>
      )}
      {visibleFindings.map((f) => (
        <div key={f.id} className="rounded-lg p-4" style={{ background: REPORT_COLORS.bgCard, borderLeft: `4px solid ${severityColors[f.severity]}` }}>
          <div className="flex items-center gap-2 mb-1">
            <Badge style={{ background: severityColors[f.severity], color: '#fff' }}>{f.severity.toUpperCase()}</Badge>
            <span className="font-semibold text-sm" style={{ color: REPORT_COLORS.heading }}>{f.title}</span>
          </div>
          <p className="text-sm mb-1" style={{ color: REPORT_COLORS.text }}>{f.description}</p>
          {f.location && <p className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>Location: {f.location}</p>}
          {f.recommendation && <p className="text-xs mt-1" style={{ color: REPORT_COLORS.primary }}>Recommendation: {f.recommendation}</p>}
        </div>
      ))}
    </div>
  );
}
