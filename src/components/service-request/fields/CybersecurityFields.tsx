import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FieldProps {
  metadata: Record<string, any>;
  onMetadataChange: (key: string, value: any) => void;
}

const ORG_TYPES = ['Software company', 'Small business', 'Nonprofit', 'Church or ministry', 'Other'];
const STAFF_SIZES = ['1-10', '11-50', '51-200', '200+'];
const PRIMARY_CONCERNS = ['Compliance', 'Risk assessment', 'Documentation', 'Incident response preparation', 'Other'];

export function CybersecurityFields({ metadata, onMetadataChange }: FieldProps) {
  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Cybersecurity Service Details</h3>
      
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
        <Label>Estimated number of users or staff</Label>
        <Select value={metadata.staffSize || ''} onValueChange={(v) => onMetadataChange('staffSize', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select staff size" />
          </SelectTrigger>
          <SelectContent>
            {STAFF_SIZES.map(size => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Primary concern</Label>
        <Select value={metadata.primaryConcern || ''} onValueChange={(v) => onMetadataChange('primaryConcern', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select primary concern" />
          </SelectTrigger>
          <SelectContent>
            {PRIMARY_CONCERNS.map(concern => (
              <SelectItem key={concern} value={concern}>{concern}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>One-time assessment or ongoing program?</Label>
        <Select value={metadata.programType || ''} onValueChange={(v) => onMetadataChange('programType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="One-time assessment">One-time assessment</SelectItem>
            <SelectItem value="Ongoing program">Ongoing program</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Do you have an internal IT or security team?</Label>
        <Select value={metadata.hasITTeam || ''} onValueChange={(v) => onMetadataChange('hasITTeam', v)}>
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
