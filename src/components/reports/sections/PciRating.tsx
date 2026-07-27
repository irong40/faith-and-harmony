import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_COLORS } from '@/lib/brand';
import type { PciRatingData, PciSampleUnitEntry, ReportImage } from '@/types/report';

interface Props {
  data: PciRatingData;
  onChange: (data: PciRatingData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

/**
 * PCI Score & Rating Band (ASTM D6433). Optional section: the distress
 * inventory (observation_log) with severity and quantity is deliverable
 * without a license, but the free public-domain PAVER manuals contain zero
 * deduct value curves, so the 0-100 PCI score is only defensible once
 * ASTM D6433 is licensed.
 *
 * Honest-boundary gating on d6433_licensed:
 * - Unlicensed (false/absent): the caveat renders in edit AND print, and
 *   every PCI number (overall score, band, per-unit PCI/band) is withheld
 *   from print. Entered values are kept in the data, just not printed.
 * - Licensed (true): scores and bands print normally and the caveat is
 *   omitted from print (a small edit-mode reminder remains). Printing the
 *   "until licensed" caveat alongside a licensed score would contradict
 *   itself; printing a score while unlicensed violates the spec's
 *   honest-boundary rule.
 */

const PCI_CAVEAT =
  'A defensible PCI score requires the deduct value curves licensed from ASTM D6433. ' +
  'The distress inventory with severity and quantity is deliverable without the license; ' +
  'the 0-100 PCI score and rating band are not, until ASTM D6433 is licensed.';

// ASTM D6433 rating bands (report-system-spec-v1 Part 5.2)
const RATING_BANDS = [
  'Good (86-100)',
  'Satisfactory (71-85)',
  'Fair (56-70)',
  'Poor (41-55)',
  'Very Poor (26-40)',
  'Serious (11-25)',
  'Failed (0-10)',
];

const emptyUnit = (): PciSampleUnitEntry => ({ unit_id: '' });

export function PciRating({ data, onChange, mode }: Props) {
  const units = data.sample_units ?? [];
  const licensed = data.d6433_licensed === true;

  const updateUnit = (i: number, patch: Partial<PciSampleUnitEntry>) => {
    const n = [...units];
    n[i] = { ...n[i], ...patch };
    onChange({ ...data, sample_units: n });
  };

  const caveat = (
    <p className="rounded border-l-4 p-3 text-xs" style={{ borderColor: REPORT_COLORS.badgeHigh, background: REPORT_COLORS.bgCard, color: REPORT_COLORS.text }}>
      {PCI_CAVEAT}
    </p>
  );

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        {licensed ? (
          <p className="text-xs text-muted-foreground">ASTM D6433 license on file: the PCI score and rating band will appear in the printed report.</p>
        ) : (
          <>
            {caveat}
            <p className="text-xs text-muted-foreground">Score and band entries below are kept, but withheld from the printed report until the license is on file.</p>
          </>
        )}
        <div className="flex items-center gap-2">
          <input
            id="d6433-licensed"
            type="checkbox"
            checked={data.d6433_licensed ?? false}
            onChange={(e) => onChange({ ...data, d6433_licensed: e.target.checked })}
          />
          <Label htmlFor="d6433-licensed">ASTM D6433 license on file (deduct curves available)</Label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Overall PCI (0-100)</Label>
            <Input type="number" value={data.overall_pci ?? ''} onChange={(e) => onChange({ ...data, overall_pci: e.target.value })} />
          </div>
          <div>
            <Label>Rating Band</Label>
            <select className="w-full rounded border px-2 py-1.5 text-sm" value={data.rating_band ?? ''} onChange={(e) => onChange({ ...data, rating_band: e.target.value })}>
              <option value="">Select...</option>
              {RATING_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
        {units.map((u, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Sample Unit</Label><Input value={u.unit_id} onChange={(e) => updateUnit(i, { unit_id: e.target.value })} /></div>
            <div className="w-24"><Label className="text-xs">PCI</Label><Input type="number" value={u.pci ?? ''} onChange={(e) => updateUnit(i, { pci: e.target.value })} /></div>
            <div className="w-44">
              <Label className="text-xs">Band</Label>
              <select className="w-full rounded border px-2 py-1.5 text-sm" value={u.band ?? ''} onChange={(e) => updateUnit(i, { band: e.target.value })}>
                <option value="">Select...</option>
                {RATING_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex-1"><Label className="text-xs">Notes</Label><Input value={u.notes ?? ''} onChange={(e) => updateUnit(i, { notes: e.target.value })} /></div>
            <Button variant="destructive" size="sm" onClick={() => onChange({ ...data, sample_units: units.filter((_, j) => j !== i) })}>Remove</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, sample_units: [...units, emptyUnit()] })}>Add Sample Unit</Button>
        <div><Label>Notes</Label><Textarea rows={2} value={data.notes ?? ''} onChange={(e) => onChange({ ...data, notes: e.target.value })} /></div>
      </div>
    );
  }

  // Print/preview: PCI numbers only render once the license is on file.
  const unitHeaders = licensed ? ['Sample Unit', 'PCI', 'Band', 'Notes'] : ['Sample Unit', 'Notes'];

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>PCI Score & Rating Band (ASTM D6433)</h2>
      {licensed && (data.overall_pci || data.rating_band) && (
        <div className="flex gap-3">
          {data.overall_pci && (
            <div className="rounded p-3 text-center" style={{ background: REPORT_COLORS.bgCard, border: `1px solid ${REPORT_COLORS.border}` }}>
              <div className="text-2xl font-bold" style={{ color: REPORT_COLORS.primary }}>{data.overall_pci}</div>
              <div className="text-xs" style={{ color: REPORT_COLORS.textSecondary }}>Overall PCI</div>
            </div>
          )}
          {data.rating_band && (
            <div className="rounded p-3 text-center" style={{ background: REPORT_COLORS.bgCard, border: `1px solid ${REPORT_COLORS.border}` }}>
              <div className="text-2xl font-bold" style={{ color: REPORT_COLORS.heading }}>{data.rating_band}</div>
              <div className="text-xs" style={{ color: REPORT_COLORS.textSecondary }}>Rating Band</div>
            </div>
          )}
        </div>
      )}
      {units.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow style={{ background: REPORT_COLORS.tableHeader }}>
              {unitHeaders.map((h) => (
                <TableHead key={h} style={{ color: REPORT_COLORS.tableHeaderText }}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((u, i) => (
              <TableRow key={i} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
                <TableCell className="font-medium">{u.unit_id}</TableCell>
                {licensed && <TableCell>{u.pci ?? ''}</TableCell>}
                {licensed && <TableCell>{u.band ?? ''}</TableCell>}
                <TableCell>{u.notes ?? ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!licensed && caveat}
      {data.notes && <p className="text-xs italic" style={{ color: REPORT_COLORS.textMuted }}>{data.notes}</p>}
    </div>
  );
}
