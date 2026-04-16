import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { REPORT_COLORS } from '@/lib/brand';
import type { SpeciesEntry, SpeciesTableData, ReportImage } from '@/types/report';

interface Props {
  data: SpeciesTableData;
  onChange: (data: SpeciesTableData) => void;
  mode: 'edit' | 'preview';
  images?: ReportImage[];
  onImagesChange?: (images: ReportImage[]) => void;
}

const emptySpecies = (): SpeciesEntry => ({ species: '', count: 0, confidence: 'medium' });

export function SpeciesTable({ data, onChange, mode }: Props) {
  const species = data.species ?? [];

  const update = (i: number, patch: Partial<SpeciesEntry>) => {
    const n = [...species]; n[i] = { ...n[i], ...patch };
    const total = n.reduce((s, e) => s + e.count, 0);
    onChange({ ...data, species: n, total_count: total });
  };

  if (mode === 'edit') {
    return (
      <div className="space-y-3">
        <div><Label>Survey Area (acres)</Label><Input type="number" value={data.survey_area_acres ?? ''} onChange={(e) => onChange({ ...data, survey_area_acres: +e.target.value })} /></div>
        {species.map((s, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1"><Label className="text-xs">Species</Label><Input value={s.species} onChange={(e) => update(i, { species: e.target.value })} /></div>
            <div className="w-24"><Label className="text-xs">Count</Label><Input type="number" value={s.count} onChange={(e) => update(i, { count: +e.target.value })} /></div>
            <div className="w-28">
              <Label className="text-xs">Confidence</Label>
              <select className="w-full rounded border px-2 py-1.5 text-sm" value={s.confidence ?? ''} onChange={(e) => update(i, { confidence: e.target.value })}>
                {['high', 'medium', 'low'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button variant="destructive" size="sm" onClick={() => { const n = species.filter((_, j) => j !== i); onChange({ ...data, species: n, total_count: n.reduce((s, e) => s + e.count, 0) }); }}>Remove</Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => onChange({ ...data, species: [...species, emptySpecies()] })}>Add Species</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif', color: REPORT_COLORS.primary }}>Species Observations</h2>
      <Table>
        <TableHeader>
          <TableRow style={{ background: REPORT_COLORS.tableHeader }}>
            <TableHead style={{ color: REPORT_COLORS.tableHeaderText }}>Species</TableHead>
            <TableHead style={{ color: REPORT_COLORS.tableHeaderText }}>Count</TableHead>
            <TableHead style={{ color: REPORT_COLORS.tableHeaderText }}>Confidence</TableHead>
            <TableHead style={{ color: REPORT_COLORS.tableHeaderText }}>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {species.map((s, i) => (
            <TableRow key={i} style={{ background: i % 2 === 0 ? REPORT_COLORS.bgTable : REPORT_COLORS.bg }}>
              <TableCell className="font-medium">{s.species}</TableCell>
              <TableCell>{s.count}</TableCell>
              <TableCell className="capitalize">{s.confidence}</TableCell>
              <TableCell className="text-xs">{s.notes}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-bold">Total</TableCell>
            <TableCell className="font-bold">{data.total_count}</TableCell>
            <TableCell colSpan={2}>{data.survey_area_acres ? `Survey area: ${data.survey_area_acres} acres` : ''}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
