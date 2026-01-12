import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MetadataValue } from "../ConditionalFields";

interface FieldProps {
  metadata: Record<string, MetadataValue>;
  onMetadataChange: (key: string, value: MetadataValue) => void;
}

const FOCUS_AREAS = ['Local Virginia history', 'Family genealogy', 'Church or community history', 'General African American history', 'Other'];
const OUTPUTS = ['Script only', 'Video only', 'Script and video', 'Research report'];
const AUDIENCES = ['Youth', 'Adults', 'Church', 'School', 'Online audience', 'Other'];

export function BlackHistoryFields({ metadata, onMetadataChange }: FieldProps) {
  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Black History Storytelling Details</h3>

      <div className="space-y-2">
        <Label>Focus area</Label>
        <Select value={metadata.focusArea || ''} onValueChange={(v) => onMetadataChange('focusArea', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select focus area" />
          </SelectTrigger>
          <SelectContent>
            {FOCUS_AREAS.map(area => (
              <SelectItem key={area} value={area}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Do you have source documents to provide?</Label>
        <Select value={metadata.hasSourceDocs || ''} onValueChange={(v) => onMetadataChange('hasSourceDocs', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
            <SelectItem value="Some">Some</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Preferred output</Label>
        <Select value={metadata.preferredOutput || ''} onValueChange={(v) => onMetadataChange('preferredOutput', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select output type" />
          </SelectTrigger>
          <SelectContent>
            {OUTPUTS.map(output => (
              <SelectItem key={output} value={output}>{output}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Intended audience</Label>
        <Select value={metadata.intendedAudience || ''} onValueChange={(v) => onMetadataChange('intendedAudience', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select audience" />
          </SelectTrigger>
          <SelectContent>
            {AUDIENCES.map(audience => (
              <SelectItem key={audience} value={audience}>{audience}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
