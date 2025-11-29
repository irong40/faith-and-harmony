import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface FieldProps {
  metadata: Record<string, any>;
  onMetadataChange: (key: string, value: any) => void;
}

const PLATFORMS = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'LinkedIn', 'Website', 'Other'];
const GOALS = ['Education', 'Promotion', 'Social media growth', 'Membership engagement', 'Documentation', 'Other'];

export function AIVideoFields({ metadata, onMetadataChange }: FieldProps) {
  const selectedPlatforms = metadata.platforms || [];

  const togglePlatform = (platform: string) => {
    const updated = selectedPlatforms.includes(platform)
      ? selectedPlatforms.filter((p: string) => p !== platform)
      : [...selectedPlatforms, platform];
    onMetadataChange('platforms', updated);
  };

  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">AI Video Creation Details</h3>
      
      <div className="space-y-2">
        <Label>Primary goal of the videos</Label>
        <Select value={metadata.primaryGoal || ''} onValueChange={(v) => onMetadataChange('primaryGoal', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select primary goal" />
          </SelectTrigger>
          <SelectContent>
            {GOALS.map(goal => (
              <SelectItem key={goal} value={goal}>{goal}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Platforms you plan to use</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PLATFORMS.map(platform => (
            <div key={platform} className="flex items-center space-x-2">
              <Checkbox
                id={`platform-${platform}`}
                checked={selectedPlatforms.includes(platform)}
                onCheckedChange={() => togglePlatform(platform)}
              />
              <label htmlFor={`platform-${platform}`} className="text-sm cursor-pointer">{platform}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Do you already have a script or outline?</Label>
        <Select value={metadata.hasScript || ''} onValueChange={(v) => onMetadataChange('hasScript', v)}>
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

      <div className="space-y-2">
        <Label>How many videos are you considering in this phase?</Label>
        <Input
          type="number"
          min="1"
          value={metadata.videoCount || ''}
          onChange={(e) => onMetadataChange('videoCount', e.target.value)}
          placeholder="Number of videos"
        />
      </div>

      <div className="space-y-2">
        <Label>Do you want automation for scheduling and posting?</Label>
        <Select value={metadata.wantAutomation || ''} onValueChange={(v) => onMetadataChange('wantAutomation', v)}>
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
