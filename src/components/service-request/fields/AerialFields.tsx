import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface FieldProps {
  metadata: Record<string, any>;
  onMetadataChange: (key: string, value: any) => void;
}

const WORK_TYPES = ['Real estate', 'Land parcel', 'Roof or structure inspection', 'Agricultural', 'Marine', 'Other'];

export function AerialFields({ metadata, onMetadataChange }: FieldProps) {
  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Aerial Photography Details</h3>
      
      <div className="space-y-2">
        <Label>Type of work</Label>
        <Select value={metadata.workType || ''} onValueChange={(v) => onMetadataChange('workType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select work type" />
          </SelectTrigger>
          <SelectContent>
            {WORK_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Property or site address</Label>
        <Input
          value={metadata.propertyAddress || ''}
          onChange={(e) => onMetadataChange('propertyAddress', e.target.value)}
          placeholder="Enter property address"
        />
      </div>

      <div className="space-y-2">
        <Label>Number of locations to be covered in one session</Label>
        <Input
          type="number"
          min="1"
          value={metadata.locationCount || ''}
          onChange={(e) => onMetadataChange('locationCount', e.target.value)}
          placeholder="Number of locations"
        />
      </div>

      <div className="space-y-2">
        <Label>Do you need photos only, or photos and video?</Label>
        <Select value={metadata.mediaType || ''} onValueChange={(v) => onMetadataChange('mediaType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Photos only">Photos only</SelectItem>
            <SelectItem value="Photos and video">Photos and video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Do you need a formal inspection report with findings?</Label>
        <Select value={metadata.needsReport || ''} onValueChange={(v) => onMetadataChange('needsReport', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
            <SelectItem value="Not sure">Not sure</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
