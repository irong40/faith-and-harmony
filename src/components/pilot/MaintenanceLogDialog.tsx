import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateMaintenanceEntry } from '@/hooks/useFleetMutations';
import type { EquipmentType, MaintenanceType } from '@/types/fleet';

interface MaintenanceLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentType: EquipmentType;
  equipmentName: string;
}

const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'firmware_update', label: 'Firmware Update' },
  { value: 'calibration', label: 'Calibration' },
];

export default function MaintenanceLogDialog({
  open,
  onOpenChange,
  equipmentId,
  equipmentType,
  equipmentName,
}: MaintenanceLogDialogProps) {
  const { toast } = useToast();
  const createEntry = useCreateMaintenanceEntry();

  const [form, setForm] = useState({
    maintenance_type: 'scheduled' as MaintenanceType,
    description: '',
    performed_at: new Date().toISOString().split('T')[0],
    cost_dollars: '',
    parts_used: '',
    next_due_date: '',
    notes: '',
  });

  const handleSubmit = async () => {
    try {
      await createEntry.mutateAsync({
        equipment_id: equipmentId,
        equipment_type: equipmentType,
        maintenance_type: form.maintenance_type,
        description: form.description || null,
        performed_at: form.performed_at ? new Date(form.performed_at).toISOString() : undefined,
        cost_cents: form.cost_dollars ? Math.round(parseFloat(form.cost_dollars) * 100) : null,
        parts_used: form.parts_used ? form.parts_used.split(',').map(p => p.trim()).filter(Boolean) : null,
        next_due_date: form.next_due_date || null,
        notes: form.notes || null,
      });
      toast({ title: 'Maintenance entry logged' });
      onOpenChange(false);
      // Reset form
      setForm({
        maintenance_type: 'scheduled',
        description: '',
        performed_at: new Date().toISOString().split('T')[0],
        cost_dollars: '',
        parts_used: '',
        next_due_date: '',
        notes: '',
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Maintenance</DialogTitle>
          <p className="text-sm text-muted-foreground">{equipmentName}</p>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Maintenance Type</Label>
            <Select
              value={form.maintenance_type}
              onValueChange={v => setForm(f => ({ ...f, maintenance_type: v as MaintenanceType }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAINTENANCE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="What was done..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Performed On</Label>
              <Input
                type="date"
                value={form.performed_at}
                onChange={e => setForm(f => ({ ...f, performed_at: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost_dollars}
                onChange={e => setForm(f => ({ ...f, cost_dollars: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Parts Used (comma separated)</Label>
            <Input
              value={form.parts_used}
              onChange={e => setForm(f => ({ ...f, parts_used: e.target.value }))}
              placeholder="propeller set, ND filter"
            />
          </div>
          <div>
            <Label className="text-xs">Next Service Due</Label>
            <Input
              type="date"
              value={form.next_due_date}
              onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createEntry.isPending}>
            {createEntry.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
