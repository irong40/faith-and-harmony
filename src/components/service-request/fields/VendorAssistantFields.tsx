import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface FieldProps {
  metadata: Record<string, any>;
  onMetadataChange: (key: string, value: any) => void;
}

const EVENT_TYPES = ['Conference', 'Church event', 'Festival', 'Pop-up market', 'Private event', 'Other'];
const ATTENDEE_SIZES = ['Under 50', '50-100', '100-250', '250-500', '500+'];
const SERVICES = ['Intake forms', 'QR codes', 'Photo delivery', 'Payment links', 'Inventory tracking', 'Other'];

export function VendorAssistantFields({ metadata, onMetadataChange }: FieldProps) {
  const selectedServices = metadata.servicesNeeded || [];

  const toggleService = (service: string) => {
    const updated = selectedServices.includes(service)
      ? selectedServices.filter((s: string) => s !== service)
      : [...selectedServices, service];
    onMetadataChange('servicesNeeded', updated);
  };

  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Vendor Assistant Details</h3>
      
      <div className="space-y-2">
        <Label>Type of event</Label>
        <Select value={metadata.eventType || ''} onValueChange={(v) => onMetadataChange('eventType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select event type" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Event date</Label>
        <Input
          type="date"
          value={metadata.eventDate || ''}
          onChange={(e) => onMetadataChange('eventDate', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Estimated number of attendees</Label>
        <Select value={metadata.attendeeCount || ''} onValueChange={(v) => onMetadataChange('attendeeCount', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select attendee count" />
          </SelectTrigger>
          <SelectContent>
            {ATTENDEE_SIZES.map(size => (
              <SelectItem key={size} value={size}>{size}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Services needed</Label>
        <div className="grid grid-cols-2 gap-3">
          {SERVICES.map(service => (
            <div key={service} className="flex items-center space-x-2">
              <Checkbox
                id={`service-${service}`}
                checked={selectedServices.includes(service)}
                onCheckedChange={() => toggleService(service)}
              />
              <label htmlFor={`service-${service}`} className="text-sm cursor-pointer">{service}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Support type</Label>
        <Select value={metadata.supportType || ''} onValueChange={(v) => onMetadataChange('supportType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select support type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="On-site support">On-site support</SelectItem>
            <SelectItem value="Remote setup only">Remote setup only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
