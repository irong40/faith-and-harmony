import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { MetadataValue } from "../ConditionalFields";

interface FieldProps {
  metadata: Record<string, MetadataValue>;
  onMetadataChange: (key: string, value: MetadataValue) => void;
}

const ORG_TYPES = ['Prince Hall Blue Lodge', 'Prince Hall OES Chapter', 'Concordant body', 'Other'];
const PROJECT_TYPES = ['Lectures', 'Virtual lodge', 'Archive digitization', 'Study series', 'Other'];
const INTENDED_USES = ['Education', 'Ritual instruction', 'Public outreach', 'Other'];

export function MasonicFields({ metadata, onMetadataChange }: FieldProps) {
  const selectedUses = metadata.intendedUses || [];

  const toggleUse = (use: string) => {
    const updated = selectedUses.includes(use)
      ? selectedUses.filter((u: string) => u !== use)
      : [...selectedUses, use];
    onMetadataChange('intendedUses', updated);
  };

  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Masonic & OES Project Details</h3>

      <div className="space-y-2">
        <Label>Organization type</Label>
        <Select value={metadata.organizationType || ''} onValueChange={(v) => onMetadataChange('organizationType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select organization type" />
          </SelectTrigger>
          <SelectContent>
            {ORG_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Type of project</Label>
        <Select value={metadata.projectType || ''} onValueChange={(v) => onMetadataChange('projectType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select project type" />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Approximate number of lectures or modules</Label>
        <Input
          type="number"
          min="1"
          value={metadata.lectureCount || ''}
          onChange={(e) => onMetadataChange('lectureCount', e.target.value)}
          placeholder="Number of lectures/modules"
        />
      </div>

      <div className="space-y-2">
        <Label>Do you already have written material?</Label>
        <Select value={metadata.hasWrittenMaterial || ''} onValueChange={(v) => onMetadataChange('hasWrittenMaterial', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
            <SelectItem value="Mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Intended use</Label>
        <div className="grid grid-cols-2 gap-3">
          {INTENDED_USES.map(use => (
            <div key={use} className="flex items-center space-x-2">
              <Checkbox
                id={`use-${use}`}
                checked={selectedUses.includes(use)}
                onCheckedChange={() => toggleUse(use)}
              />
              <label htmlFor={`use-${use}`} className="text-sm cursor-pointer">{use}</label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
