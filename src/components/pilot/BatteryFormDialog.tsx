import { useState, useEffect } from 'react';
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
import { useCreateBattery, useUpdateBattery } from '@/hooks/useFleetMutations';
import { useAllAircraft } from '@/hooks/useFleet';
import type { Battery } from '@/types/fleet';

interface BatteryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  battery?: Battery | null;
}

export default function BatteryFormDialog({ open, onOpenChange, battery }: BatteryFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateBattery();
  const updateMutation = useUpdateBattery();
  const { data: aircraft } = useAllAircraft();
  const isEdit = !!battery;

  const [form, setForm] = useState({
    serial_number: '',
    model: '',
    capacity_mah: '5000',
    aircraft_id: '',
    status: 'active',
    purchase_date: '',
    notes: '',
  });

  useEffect(() => {
    if (battery) {
      setForm({
        serial_number: battery.serial_number || '',
        model: battery.model || '',
        capacity_mah: String(battery.capacity_mah || 5000),
        aircraft_id: battery.aircraft_id || '',
        status: battery.status || 'active',
        purchase_date: battery.purchase_date?.split('T')[0] || '',
        notes: battery.notes || '',
      });
    } else {
      setForm({
        serial_number: '',
        model: '',
        capacity_mah: '5000',
        aircraft_id: '',
        status: 'active',
        purchase_date: '',
        notes: '',
      });
    }
  }, [battery, open]);

  const handleSubmit = async () => {
    if (!form.serial_number.trim()) {
      toast({ title: 'Serial number is required', variant: 'destructive' });
      return;
    }

    const payload = {
      serial_number: form.serial_number,
      model: form.model || null,
      capacity_mah: parseInt(form.capacity_mah, 10) || 5000,
      aircraft_id: form.aircraft_id || null,
      status: form.status,
      purchase_date: form.purchase_date || null,
      notes: form.notes || null,
    };

    try {
      if (isEdit && battery) {
        await updateMutation.mutateAsync({ id: battery.id, ...payload });
        toast({ title: 'Battery updated' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Battery added' });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Battery' : 'Add Battery'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Serial Number *</Label>
            <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Model</Label>
            <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="TB65" />
          </div>
          <div>
            <Label className="text-xs">Capacity (mAh)</Label>
            <Input type="number" value={form.capacity_mah} onChange={e => setForm(f => ({ ...f, capacity_mah: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Assigned Aircraft</Label>
            <Select value={form.aircraft_id} onValueChange={v => setForm(f => ({ ...f, aircraft_id: v }))}>
              <SelectTrigger><SelectValue placeholder="None (unassigned)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {aircraft?.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.nickname || a.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Purchase Date</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Battery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
