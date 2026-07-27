import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { GenericNarrativeSectionData, ReportImage } from '@/types/report';

/**
 * Parameterized narrative section: description + optional scalar fields +
 * attached images + optional fixed callout. One component serves every
 * "narrative + optional image + a few metrics" section key; register a
 * configured instance per key via makeNarrativeSection() rather than
 * copy-pasting components (see renderLayerSections.ts).
 */

export interface SectionFieldDef {
  id: string;
  label: string;
  type?: 'text' | 'number';
  placeholder?: string;
}

export interface NarrativeSectionConfig {
  title: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  descriptionRows?: number;
  fields?: SectionFieldDef[];
  /** Fixed caveat/disclosure rendered verbatim in BOTH modes. */
  callout?: string;
  /** Dashed placeholder text when no images are attached (omit to render nothing). */
  emptyImageLabel?: string;
  /** Set false for text-only sections (limitations, disclosures). */
  showImages?: boolean;
}

interface Props {
  data: GenericNarrativeSectionData;
  onChange: (data: GenericNarrativeSectionData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
  config: NarrativeSectionConfig;
}

export function GenericNarrative({ data, onChange, mode, images, config }: Props) {
  const values = data.values ?? {};
  const fields = config.fields ?? [];
  const setValue = (id: string, v: string) => onChange({ ...data, values: { ...values, [id]: v } });

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        {config.callout && (
          <p className="rounded border-l-4 p-3 text-xs" style={{ borderColor: REPORT_COLORS.primary, background: REPORT_COLORS.bgCard, color: REPORT_COLORS.text }}>{config.callout}</p>
        )}
        <div>
          <Label>{config.descriptionLabel ?? 'Description'}</Label>
          <Textarea rows={config.descriptionRows ?? 4} placeholder={config.descriptionPlaceholder} value={data.description ?? ''} onChange={(e) => onChange({ ...data, description: e.target.value })} />
        </div>
        {fields.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.id}>
                <Label>{f.label}</Label>
                <Input type={f.type ?? 'text'} placeholder={f.placeholder} value={values[f.id] ?? ''} onChange={(e) => setValue(f.id, e.target.value)} />
              </div>
            ))}
          </div>
        )}
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
        {config.showImages !== false && <p className="text-xs text-muted-foreground">Upload images in the Report Builder (Phase 3).</p>}
      </div>
    );
  }

  const imgs = images ?? [];
  const filled = fields.filter((f) => (values[f.id] ?? '') !== '');

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>{config.title}</h2>
      {data.description && <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: REPORT_COLORS.text }}>{data.description}</p>}
      {filled.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filled.map((f) => (
            <div key={f.id} className="rounded p-3" style={{ background: REPORT_COLORS.bgCard, border: `1px solid ${REPORT_COLORS.border}` }}>
              <div className="text-xs" style={{ color: REPORT_COLORS.textSecondary }}>{f.label}</div>
              <div className="text-sm font-semibold" style={{ color: REPORT_COLORS.heading }}>{values[f.id]}</div>
            </div>
          ))}
        </div>
      )}
      {config.showImages !== false && (imgs.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {imgs.map((img) => (
            <div key={img.id} className="rounded overflow-hidden" style={{ border: `1px solid ${REPORT_COLORS.border}` }}>
              <img src={img.image_url} alt={img.caption ?? config.title} className="w-full object-cover" />
              {img.caption && <p className="text-xs p-2 text-center" style={{ background: REPORT_COLORS.bgCard, color: REPORT_COLORS.textMuted }}>{img.caption}</p>}
            </div>
          ))}
        </div>
      ) : config.emptyImageLabel ? (
        <div className="rounded border border-dashed p-8 text-center text-sm" style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.textMuted }}>{config.emptyImageLabel}</div>
      ) : null)}
      {config.callout && (
        <p className="rounded border-l-4 p-3 text-xs" style={{ borderColor: REPORT_COLORS.primary, background: REPORT_COLORS.bgCard, color: REPORT_COLORS.textSecondary }}>{config.callout}</p>
      )}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}

/** Bind a config to the generic component so it can be registered per section key. */
export function makeNarrativeSection(config: NarrativeSectionConfig) {
  const Bound = (props: Omit<Props, 'config'>) => <GenericNarrative {...props} config={config} />;
  Bound.displayName = `NarrativeSection(${config.title})`;
  return Bound;
}
