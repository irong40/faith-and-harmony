import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { MetadataValue } from "../ConditionalFields";

interface FieldProps {
  metadata: Record<string, MetadataValue>;
  onMetadataChange: (key: string, value: MetadataValue) => void;
}

const TECH_AREAS = ['Sound system', 'Livestream', 'Recording', 'Monitors', 'Wireless mics', 'Other'];
const SANCTUARY_SIZES = ['Under 100', '100-300', '300-500', '500+'];

export function ChurchTechFields({ metadata, onMetadataChange }: FieldProps) {
  const selectedAreas = metadata.techAreas || [];

  const toggleArea = (area: string) => {
    const updated = selectedAreas.includes(area)
      ? selectedAreas.filter((a: string) => a !== area)
      : [...selectedAreas, area];
    onMetadataChange('techAreas', updated);
  };

  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Church Technology Details</h3>

      <div className="space-y-2">
        <Label>Which areas do you want help with?</Label>
        <div className="grid grid-cols-2 gap-3">
          {TECH_AREAS.map(area => (
            <div key={area} className="flex items-center space-x-2">
              <Checkbox
                id={`area-${area}`}
                checked={selectedAreas.includes(area)}
                onCheckedChange={() => toggleArea(area)}
              />
              <label htmlFor={`area-${area}`} className="text-sm cursor-pointer">{area}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Size of sanctuary (seating capacity)</Label>
        <Select value={metadata.sanctuarySize || ''} onValueChange={(v) => onMetadataChange('sanctuarySize', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select sanctuary size" />
          </SelectTrigger>
          <SelectContent>
            {SANCTUARY_SIZES.map(size => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Do you currently have a mixer and audio team?</Label>
        <Select value={metadata.hasAudioTeam || ''} onValueChange={(v) => onMetadataChange('hasAudioTeam', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
            <SelectItem value="Partially">Partially</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
