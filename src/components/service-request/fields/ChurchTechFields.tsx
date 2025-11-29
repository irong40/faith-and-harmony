import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface FieldProps {
  metadata: Record<string, any>;
  onMetadataChange: (key: string, value: any) => void;
}

const SERVICE_TYPES = ['Church tech support', 'Gospel saxophone coaching', 'Both'];
const TECH_AREAS = ['Sound system', 'Livestream', 'Recording', 'Monitors', 'Wireless mics', 'Other'];
const SANCTUARY_SIZES = ['Under 100', '100-300', '300-500', '500+'];
const SAX_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const SAX_INSTRUMENTS = ['Tenor', 'Alto', 'Both'];
const SAX_FORMATS = ['In-person', 'Online', 'Hybrid'];

export function ChurchTechFields({ metadata, onMetadataChange }: FieldProps) {
  const selectedAreas = metadata.techAreas || [];
  const serviceType = metadata.serviceType || '';

  const toggleArea = (area: string) => {
    const updated = selectedAreas.includes(area)
      ? selectedAreas.filter((a: string) => a !== area)
      : [...selectedAreas, area];
    onMetadataChange('techAreas', updated);
  };

  const showTech = serviceType === 'Church tech support' || serviceType === 'Both';
  const showSax = serviceType === 'Gospel saxophone coaching' || serviceType === 'Both';

  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Church Tech & Gospel Saxophone Details</h3>
      
      <div className="space-y-2">
        <Label>Are you requesting church tech support, gospel saxophone coaching, or both?</Label>
        <Select value={serviceType} onValueChange={(v) => onMetadataChange('serviceType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select service type" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showTech && (
        <>
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
        </>
      )}

      {showSax && (
        <>
          <div className="space-y-2">
            <Label>Saxophone level</Label>
            <Select value={metadata.saxLevel || ''} onValueChange={(v) => onMetadataChange('saxLevel', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {SAX_LEVELS.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Instrument</Label>
            <Select value={metadata.saxInstrument || ''} onValueChange={(v) => onMetadataChange('saxInstrument', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select instrument" />
              </SelectTrigger>
              <SelectContent>
                {SAX_INSTRUMENTS.map(inst => (
                  <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Preferred format</Label>
            <Select value={metadata.saxFormat || ''} onValueChange={(v) => onMetadataChange('saxFormat', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {SAX_FORMATS.map(format => (
                  <SelectItem key={format} value={format}>{format}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
