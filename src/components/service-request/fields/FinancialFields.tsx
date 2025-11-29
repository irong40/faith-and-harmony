import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FieldProps {
  metadata: Record<string, any>;
  onMetadataChange: (key: string, value: any) => void;
}

const PRIMARY_GOALS = ['Debt reduction', 'Land purchase', 'Financial organization', 'All of the above', 'Other'];
const CURRENT_STAGES = ['Just starting', 'Active but not consistent', 'Ready for next property', 'Other'];
const TIME_HORIZONS = ['Under 6 months', '6-12 months', 'Over 12 months'];

export function FinancialFields({ metadata, onMetadataChange }: FieldProps) {
  return (
    <div className="space-y-6 p-6 bg-card/50 rounded-xl border border-border">
      <h3 className="text-lg font-semibold text-primary font-display">Financial Coaching Details</h3>
      
      <div className="space-y-2">
        <Label>Primary goal</Label>
        <Select value={metadata.primaryGoal || ''} onValueChange={(v) => onMetadataChange('primaryGoal', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select primary goal" />
          </SelectTrigger>
          <SelectContent>
            {PRIMARY_GOALS.map(goal => (
              <SelectItem key={goal} value={goal}>{goal}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Current stage</Label>
        <Select value={metadata.currentStage || ''} onValueChange={(v) => onMetadataChange('currentStage', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select current stage" />
          </SelectTrigger>
          <SelectContent>
            {CURRENT_STAGES.map(stage => (
              <SelectItem key={stage} value={stage}>{stage}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Time horizon for land purchase</Label>
        <Select value={metadata.timeHorizon || ''} onValueChange={(v) => onMetadataChange('timeHorizon', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select time horizon" />
          </SelectTrigger>
          <SelectContent>
            {TIME_HORIZONS.map(horizon => (
              <SelectItem key={horizon} value={horizon}>{horizon}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Are you comfortable sharing financial statements during coaching?</Label>
        <Select value={metadata.comfortableSharing || ''} onValueChange={(v) => onMetadataChange('comfortableSharing', v)}>
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
