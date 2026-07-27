import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type {
  AccuracyCheckpointReportData,
  AccuracyProductEntry,
  AccuracyProductType,
  AccuracyStatementCase,
  ReportImage,
} from '@/types/report';

interface Props {
  data: AccuracyCheckpointReportData;
  onChange: (data: AccuracyCheckpointReportData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

/**
 * ASPRS Positional Accuracy Standards, Edition 2, Version 2 (2024) §7.16.
 * The statement wording below is VERBATIM per case and is never paraphrased
 * or hand-edited: the operator picks the case, includes the products that
 * apply, and enters the numbers. The fixed wording renders with the numbers
 * inserted. Blanks render as ___ so an incomplete statement is visible.
 *
 * The reduced-checkpoint case shows the standard's horizontal statement
 * verbatim; the NVA / VVA / 3D forms follow the same pattern per the spec
 * ("the NVA / VVA / 3D forms follow the same pattern"). The "produced to
 * meet" case offers no 3D statement because the standard's produced-to-meet
 * wording is only given for horizontal, NVA and VVA.
 */

const CASE_LABELS: Record<AccuracyStatementCase, string> = {
  tested_30plus: 'Tested: 30 or more independent checkpoints',
  produced: 'Produced to meet: no independent checkpoints (RTK-only default)',
  tested_reduced: 'Tested with fewer than 30 checkpoints (reduced-checkpoint statement)',
};

const PRODUCT_LABELS: Record<AccuracyProductType, string> = {
  horizontal: 'Horizontal (RMSE-H)',
  nva: 'Non-Vegetated Vertical (NVA)',
  vva: 'Vegetated Vertical (VVA)',
  threed: 'Three-Dimensional (3D)',
};

const PRODUCT_ORDER: AccuracyProductType[] = ['horizontal', 'nva', 'vva', 'threed'];

const v = (s?: string) => (s && s.trim() !== '' ? s.trim() : '___');

function Rmse({ sub }: { sub: string }) {
  return (
    <>
      RMSE<sub>{sub}</sub>
    </>
  );
}

const OPENING_TESTED =
  'This data set was tested to meet ASPRS Positional Accuracy Standards for Digital Geospatial Data, Edition 2, Version 2 (2024) for a ';
const OPENING_PRODUCED =
  'This data set was produced to meet ASPRS Positional Accuracy Standards for Digital Geospatial Data, Edition 2, Version 2 (2024) for a ';
const OPENING_REDUCED =
  'This data set was tested as required by ASPRS Positional Accuracy Standards for Digital Geospatial Data, Edition 2, Version 2 (2024). Although the Standards call for a minimum of thirty (30) checkpoints, this test was performed using ONLY ';

function StatementText({
  type,
  entry,
  statementCase,
  checkpointCount,
}: {
  type: AccuracyProductType;
  entry: AccuracyProductEntry;
  statementCase: AccuracyStatementCase;
  checkpointCount?: string;
}) {
  const cls = v(entry.class_cm);
  const tested = v(entry.tested_cm);
  const testedVva = v(entry.tested_cm_vva);

  if (statementCase === 'produced') {
    switch (type) {
      case 'horizontal':
        return (
          <>
            {OPENING_PRODUCED}
            {cls}(cm) <Rmse sub="H" /> Horizontal Positional Accuracy Class.
          </>
        );
      case 'nva':
        return (
          <>
            {OPENING_PRODUCED}
            {cls}(cm) <Rmse sub="V" /> Non-Vegetated Vertical Accuracy (NVA) Class.
          </>
        );
      case 'vva':
        return (
          <>
            {OPENING_PRODUCED}
            {cls}(cm) <Rmse sub="V" /> Vegetated Vertical Accuracy (VVA) Class.
          </>
        );
      default:
        return null; // no produced-to-meet 3D statement in the standard
    }
  }

  if (statementCase === 'tested_reduced') {
    const reducedOpening = (
      <>
        {OPENING_REDUCED}
        {v(checkpointCount)} checkpoints.{' '}
      </>
    );
    switch (type) {
      case 'horizontal':
        return (
          <>
            {reducedOpening}This data set was produced to meet a {cls}(cm) <Rmse sub="H" /> Horizontal Positional Accuracy
            Class. The tested horizontal positional accuracy was found to be <Rmse sub="H" /> = {tested}(cm) using the reduced
            number of checkpoints.
          </>
        );
      case 'nva':
        return (
          <>
            {reducedOpening}This data set was produced to meet a {cls}(cm) <Rmse sub="V" /> Vertical Accuracy Class. The
            Non-Vegetated Vertical Accuracy (NVA) was found to be <Rmse sub="V" /> = {tested}(cm) using the reduced number of
            checkpoints.
          </>
        );
      case 'vva':
        return (
          <>
            {reducedOpening}This data set was produced to meet a {cls}(cm) <Rmse sub="V" /> Vertical Accuracy Class. The
            Vegetated Vertical Accuracy (VVA) was found to be <Rmse sub="V" /> = {tested}(cm) using the reduced number of
            checkpoints.
          </>
        );
      case 'threed':
        return (
          <>
            {reducedOpening}This data set was produced to meet a {cls}(cm) <Rmse sub="3D" /> Three-Dimensional Positional
            Accuracy Class. The tested three-dimensional accuracy was found to be <Rmse sub="3D" /> = {tested}(cm) within the
            NVA tested area and <Rmse sub="3D" /> = {testedVva}(cm) within the VVA tested area using the reduced number of
            checkpoints.
          </>
        );
    }
  }

  // tested_30plus
  switch (type) {
    case 'horizontal':
      return (
        <>
          {OPENING_TESTED}
          {cls}(cm) <Rmse sub="H" /> Horizontal Positional Accuracy Class. The tested horizontal positional accuracy was found
          to be <Rmse sub="H" /> = {tested}(cm).
        </>
      );
    case 'nva':
      return (
        <>
          {OPENING_TESTED}
          {cls}(cm) <Rmse sub="V" /> Vertical Accuracy Class. The Non-Vegetated Vertical Accuracy (NVA) was found to be{' '}
          <Rmse sub="V" /> = {tested}(cm).
        </>
      );
    case 'vva':
      return (
        <>
          {OPENING_TESTED}
          {cls}(cm) <Rmse sub="V" /> Vertical Accuracy Class. The Vegetated Vertical Accuracy (VVA) was found to be{' '}
          <Rmse sub="V" /> = {tested}(cm).
        </>
      );
    case 'threed':
      return (
        <>
          {OPENING_TESTED}
          {cls}(cm) <Rmse sub="3D" /> Three-Dimensional Positional Accuracy Class. The tested three-dimensional accuracy was
          found to be <Rmse sub="3D" /> = {tested}(cm) within the NVA tested area and <Rmse sub="3D" /> = {testedVva}(cm)
          within the VVA tested area.
        </>
      );
  }
}

export function AccuracyCheckpointReport({ data, onChange, mode }: Props) {
  const statementCase: AccuracyStatementCase = data.statement_case ?? 'produced';
  const products = data.products ?? {};
  const availableProducts = statementCase === 'produced' ? PRODUCT_ORDER.filter((p) => p !== 'threed') : PRODUCT_ORDER;
  const included = availableProducts.filter((p) => products[p]?.included);

  const updateProduct = (type: AccuracyProductType, patch: Partial<AccuracyProductEntry>) =>
    onChange({ ...data, products: { ...products, [type]: { ...products[type], ...patch } } });

  const statements = included.map((type) => (
    <blockquote
      key={type}
      className="rounded p-3 text-sm leading-relaxed"
      style={{ background: REPORT_COLORS.bgCard, borderLeft: `4px solid ${REPORT_COLORS.borderAccent}`, color: REPORT_COLORS.text }}
    >
      <StatementText type={type} entry={products[type] ?? {}} statementCase={statementCase} checkpointCount={data.checkpoint_count} />
    </blockquote>
  ));

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <p className="rounded border-l-4 p-3 text-xs" style={{ borderColor: REPORT_COLORS.primary, background: REPORT_COLORS.bgCard, color: REPORT_COLORS.text }}>
          RTK alone is not a checkpoint: missions without independent checkpoints use the "produced to meet" statement, never
          "tested to meet". Checkpoints must be independent of any control used in processing and surveyed to at least twice the
          accuracy claimed. Below 30 checkpoints, the reduced-checkpoint statement is mandatory. Statement wording is fixed by
          the standard; enter numbers only.
        </p>
        <div>
          <Label>Statement Case</Label>
          <select
            className="w-full rounded border px-2 py-1.5 text-sm"
            value={statementCase}
            onChange={(e) => onChange({ ...data, statement_case: e.target.value as AccuracyStatementCase })}
          >
            {(Object.keys(CASE_LABELS) as AccuracyStatementCase[]).map((c) => (
              <option key={c} value={c}>{CASE_LABELS[c]}</option>
            ))}
          </select>
        </div>
        {statementCase !== 'produced' && (
          <div className="w-56">
            <Label>Independent Checkpoint Count</Label>
            <Input type="number" value={data.checkpoint_count ?? ''} onChange={(e) => onChange({ ...data, checkpoint_count: e.target.value })} />
          </div>
        )}
        {availableProducts.map((type) => {
          const entry = products[type] ?? {};
          return (
            <div key={type} className="rounded border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  id={`acc-${type}`}
                  type="checkbox"
                  checked={entry.included ?? false}
                  onChange={(e) => updateProduct(type, { included: e.target.checked })}
                />
                <Label htmlFor={`acc-${type}`}>{PRODUCT_LABELS[type]}</Label>
              </div>
              {entry.included && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Accuracy Class (cm)</Label>
                    <Input type="number" value={entry.class_cm ?? ''} onChange={(e) => updateProduct(type, { class_cm: e.target.value })} />
                  </div>
                  {statementCase !== 'produced' && (
                    <div>
                      <Label className="text-xs">{type === 'threed' ? 'Tested RMSE, NVA area (cm)' : 'Tested RMSE (cm)'}</Label>
                      <Input type="number" value={entry.tested_cm ?? ''} onChange={(e) => updateProduct(type, { tested_cm: e.target.value })} />
                    </div>
                  )}
                  {statementCase !== 'produced' && type === 'threed' && (
                    <div>
                      <Label className="text-xs">Tested RMSE, VVA area (cm)</Label>
                      <Input type="number" value={entry.tested_cm_vva ?? ''} onChange={(e) => updateProduct(type, { tested_cm_vva: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>GSD</Label>
            <Input placeholder="e.g. 1.2 cm/px" value={data.gsd ?? ''} onChange={(e) => onChange({ ...data, gsd: e.target.value })} />
          </div>
          <div>
            <Label>Datum / Epoch Reference</Label>
            <Input placeholder="e.g. NAD83(2011) epoch 2010.00, see Datum section" value={data.datum_note ?? ''} onChange={(e) => onChange({ ...data, datum_note: e.target.value })} />
          </div>
        </div>
        {included.length > 0 && (
          <div className="space-y-2">
            <Label>Statement Preview (fixed wording)</Label>
            {statements}
          </div>
        )}
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>
        Positional Accuracy & Checkpoint Report
      </h2>
      <p className="text-sm" style={{ color: REPORT_COLORS.textSecondary }}>
        {statementCase === 'produced'
          ? 'No independent checkpoints were used; accuracy is stated as produced to meet.'
          : `Independent checkpoints used: ${v(data.checkpoint_count)}`}
      </p>
      {statements.length > 0 ? (
        <div className="space-y-2">{statements}</div>
      ) : (
        <div className="rounded border border-dashed p-8 text-center text-sm" style={{ borderColor: REPORT_COLORS.border, color: REPORT_COLORS.textMuted }}>
          No accuracy statements included
        </div>
      )}
      {(data.gsd || data.datum_note) && (
        <p className="text-xs" style={{ color: REPORT_COLORS.textMuted }}>
          {[data.gsd ? `GSD: ${data.gsd}` : null, data.datum_note ? `Datum/Epoch: ${data.datum_note}` : null]
            .filter(Boolean)
            .join(' | ')}
        </p>
      )}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
