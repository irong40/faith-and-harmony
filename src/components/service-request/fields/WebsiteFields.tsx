import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MetadataValue } from "../ConditionalFields";

interface FieldProps {
  metadata: Record<string, MetadataValue>;
  onMetadataChange: (key: string, value: MetadataValue) => void;
}

const PAGE_COUNTS = ['1', '2-5', '6-10', 'More than 10'];
const DOMAIN_APPROACHES = ['Use my existing domain', 'I need help getting a domain', 'Host under sentinelaerialinspections.com'];

export function WebsiteFields({ metadata, onMetadataChange }: FieldProps) {
  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Website Development Details</h3>

      <div className="space-y-2">
        <Label>Is this a new website or a redesign?</Label>
        <Select value={metadata.websiteType || ''} onValueChange={(v) => onMetadataChange('websiteType', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="New website">New website</SelectItem>
            <SelectItem value="Redesign existing">Redesign existing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Approximate number of pages</Label>
        <Select value={metadata.pageCount || ''} onValueChange={(v) => onMetadataChange('pageCount', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select page count" />
          </SelectTrigger>
          <SelectContent>
            {PAGE_COUNTS.map(count => (
              <SelectItem key={count} value={count}>{count}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Do you already have a logo and branding?</Label>
        <Select value={metadata.hasBranding || ''} onValueChange={(v) => onMetadataChange('hasBranding', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Yes">Yes</SelectItem>
            <SelectItem value="No">No</SelectItem>
            <SelectItem value="Needs help">Needs help</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Do you already have written content?</Label>
        <Select value={metadata.hasContent || ''} onValueChange={(v) => onMetadataChange('hasContent', v)}>
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
        <Label>Preferred domain approach</Label>
        <Select value={metadata.domainApproach || ''} onValueChange={(v) => onMetadataChange('domainApproach', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select domain approach" />
          </SelectTrigger>
          <SelectContent>
            {DOMAIN_APPROACHES.map(approach => (
              <SelectItem key={approach} value={approach}>{approach}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
