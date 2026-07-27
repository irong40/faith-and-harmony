import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { GenericTableSectionData, ReportImage } from '@/types/report';
import type { SectionFieldDef } from './GenericNarrative';

/**
 * Parameterized table section: repeating rows with configured columns +
 * optional narrative, scalar fields, images and fixed callout. One component
 * serves every "list of records" section key; register a configured instance
 * per key via makeTableSection() (see renderLayerSections.ts).
 */

export interface TableColumnDef {
  id: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'url';
  options?: string[];
  placeholder?: string;
}

export interface TableSectionConfig {
  title: string;
  columns: TableColumnDef[];
  addLabel: string;
  /** Empty-state noun, e.g. "stockpiles" -> "No stockpiles recorded". */
  rowNoun: string;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  fields?: SectionFieldDef[];
  /** Fixed caveat/disclosure rendered verbatim in BOTH modes. */
  callout?: string;
  emptyImageLabel?: string;
  showImages?: boolean;
}

interface Props {
  data: GenericTableSectionData;
  onChange: (data: GenericTableSectionData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
  config: TableSectionConfig;
}

const emptyRow = (columns: TableColumnDef[]): Record<string, string> =>
  Object.fromEntries(columns.map((c) => [c.id, '']));

export function GenericTable({ data, onChange, mode, images, config }: Props) {
  const rows = data.rows ?? [];
  const values = data.values ?? {};
  const fields = config.fields ?? [];

  const updateRow = (i: number, colId: string, v: string) => {
    const n = [...rows];
    n[i] = { ...n[i], [colId]: v };
    onChange({ ...data, rows: n });
  };
  const setValue = (id: string, v: string) => onChange({ ...data, values: { ...values, [id]: v } });

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        {config.callout && (
          <p className="rounded border-l-4 p-3 text-xs" style={{ borderColor: REPORT_COLORS.primary, background: REPORT_COLORS.bgCard, color: REPORT_COLORS.text }}>{config.callout}</p>
        )}
        <div>
          <Label>{config.descriptionLabel ?? 'Description'}</Label>
          <Textarea rows={3} placeholder={config.descriptionPlaceholder} value={data.description ?? ''} onChange={(e) => onChange({ ...data, description: e.target.value })} />
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
        {rows.map((row, i) => (
          <div key={i} className="rounded border p-3 space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {config.columns.map((col) => (
                <div key={col.id}>
                  <Label className="text-xs">{col.label}</Label>
                  {col.type === 'select' ? (
                    <select className="w-full rounded border px-2 py-1.5 text-sm" value={row[col.id] ?? ''} onChange={(e) => updateRow(i, col.id, e.target.value)}>
                      <option value="">Select...</option>
                      {(col.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input type={col.type === 'number' ? 'number' : 'text'} placeholder={col.placeholder} value={row[col.id] ?? ''} onChange={(e) => updateRow(i, col.id, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
            <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, rows: rows.filter((_, j) => j !== i) })}>Remove</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, rows: [...rows, emptyRow(config.columns)] })}>{config.addLabel}</Button>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
        {config.showImages === true && <p className="text-xs text-muted-foreground">Upload images in the Report Builder (Phase 3).</p>}
      </div>
    );
  }

  const imgs = images ?? [];
  const filled = fields.filter((f) => (values[f.id] ?? '') !== '');

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>{config.title}</h2>
      {data.description && <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: REPORT_COLORS.text }}>{data.description}</p>}
      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow style={{ background: REPORT_COLORS.tableHeader }}>
              {config.columns.map((col) => (
                <TableHead key={col.id} style={{ color: REPORT_COLORS.tableHeaderText }}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
                {config.columns.map((col) => (
                  <TableCell key={col.id} className="text-sm">
                    {col.type === 'url' && row[col.id] ? (
                      <a href={row[col.id]} target="_blank" rel="noopener noreferrer" className="underline break-all" style={{ color: REPORT_COLORS.primaryDark }}>{row[col.id]}</a>
                    ) : (
                      row[col.id] ?? ''
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="rounded border border-dashed p-8 text-center text-sm" style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.textMuted }}>No {config.rowNoun} recorded</div>
      )}
      {filled.length > 0 && (
        <p className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>
          {filled.map((f, i) => `${i > 0 ? ' | ' : ''}${f.label}: ${values[f.id]}`).join('')}
        </p>
      )}
      {config.showImages === true && imgs.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {imgs.map((img) => (
            <div key={img.id} className="rounded overflow-hidden" style={{ border: `1px solid ${REPORT_COLORS.border}` }}>
              <img src={img.image_url} alt={img.caption ?? config.title} className="w-full object-cover" />
              {img.caption && <p className="text-xs p-2 text-center" style={{ background: REPORT_COLORS.bgCard, color: REPORT_COLORS.textMuted }}>{img.caption}</p>}
            </div>
          ))}
        </div>
      )}
      {config.callout && (
        <p className="rounded border-l-4 p-3 text-xs" style={{ borderColor: REPORT_COLORS.primary, background: REPORT_COLORS.bgCard, color: REPORT_COLORS.textSecondary }}>{config.callout}</p>
      )}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}

/** Bind a config to the generic component so it can be registered per section key. */
export function makeTableSection(config: TableSectionConfig) {
  const Bound = (props: Omit<Props, 'config'>) => <GenericTable {...props} config={config} />;
  Bound.displayName = `TableSection(${config.title})`;
  return Bound;
}
