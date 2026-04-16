import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SAI_BRAND, REPORT_COLORS } from '@/lib/brand';
import type { CoverPageData, ReportImage } from '@/types/report';

interface Props {
  data: CoverPageData;
  onChange: (data: CoverPageData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const fields: { key: keyof CoverPageData; label: string }[] = [
  { key: 'title', label: 'Report Title' },
  { key: 'subtitle', label: 'Subtitle' },
  { key: 'client_name', label: 'Client Name' },
  { key: 'client_company', label: 'Client Company' },
  { key: 'property_address', label: 'Property Address' },
  { key: 'report_date', label: 'Report Date' },
  { key: 'job_number', label: 'Job Number' },
  { key: 'pilot_name', label: 'Pilot in Command' },
  { key: 'prepared_by', label: 'Prepared By' },
  { key: 'classification', label: 'Classification' },
];

export function CoverPage({ data, onChange, mode }: Props) {
  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        {fields.map(({ key, label }) => (
          <div key={key}>
            <Label>{label}</Label>
            <Input
              value={(data[key] as string) ?? ''}
              onChange={(e) => onChange({ ...data, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] text-center p-12" style={{ background: REPORT_COLORS.bg }}>
      <div className="border-b-4 pb-6 mb-6 w-full max-w-lg" style={{ borderColor: REPORT_COLORS.primary }}>
        <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>
          {data.title}
        </h1>
        {data.subtitle && <p className="text-lg" style={{ color: REPORT_COLORS.textSecondary }}>{data.subtitle}</p>}
      </div>
      <div className="space-y-1 text-sm" style={{ color: REPORT_COLORS.text }}>
        <p><strong>Client:</strong> {data.client_name}{data.client_company ? ` - ${data.client_company}` : ''}</p>
        <p><strong>Property:</strong> {data.property_address}</p>
        <p><strong>Date:</strong> {data.report_date}</p>
        <p><strong>Job #:</strong> {data.job_number}</p>
        <p><strong>Pilot:</strong> {data.pilot_name}</p>
        <p><strong>Prepared By:</strong> {data.prepared_by}</p>
        <p className="mt-4 uppercase tracking-widest text-xs" style={{ color: REPORT_COLORS.primary }}>{data.classification}</p>
      </div>
      <p className="mt-8 text-xs" style={{ color: REPORT_COLORS.textMuted }}>{SAI_BRAND.copyright}</p>
    </div>
  );
}
