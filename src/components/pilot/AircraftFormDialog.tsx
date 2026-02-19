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
import { useCreateAircraft, useUpdateAircraft } from '@/hooks/useFleetMutations';
import type { Aircraft } from '@/types/fleet';

interface AircraftFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aircraft?: Aircraft | null;
}

export default function AircraftFormDialog({ open, onOpenChange, aircraft }: AircraftFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateAircraft();
  const updateMutation = useUpdateAircraft();
  const isEdit = !!aircraft;

  const [form, setForm] = useState({
    model: '',
    serial_number: '',
    nickname: '',
    faa_registration: '',
    firmware_version: '',
    insurance_expiry: '',
    purchase_date: '',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (aircraft) {
      setForm({
        model: aircraft.model || '',
        serial_number: aircraft.serial_number || '',
        nickname: aircraft.nickname || '',
        faa_registration: aircraft.faa_registration || '',
        firmware_version: aircraft.firmware_version || '',
        insurance_expiry: aircraft.insurance_expiry?.split('T')[0] || '',
        purchase_date: aircraft.purchase_date?.split('T')[0] || '',
        status: aircraft.status || 'active',
        notes: aircraft.notes || '',
      });
    } else {
      setForm({
        model: '',
        serial_number: '',
        nickname: '',
        faa_registration: '',
        firmware_version: '',
        insurance_expiry: '',
        purchase_date: '',
        status: 'active',
        notes: '',
      });
    }
  }, [aircraft, open]);

  const handleSubmit = async () => {
    if (!form.model.trim() || !form.serial_number.trim()) {
      toast({ title: 'Model and serial number are required', variant: 'destructive' });
      return;
    }

    try {
      if (isEdit && aircraft) {
        await updateMutation.mutateAsync({ id: aircraft.id, ...form });
        toast({ title: 'Aircraft updated' });
      } else {
        await createMutation.mutateAsync(form);
        toast({ title: 'Aircraft added' });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Aircraft' : 'Add Aircraft'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Model *</Label>
            <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="DJI Matrice 4E" />
          </div>
          <div>
            <Label className="text-xs">Serial Number *</Label>
            <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Nickname</Label>
            <Input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="Primary" />
          </div>
          <div>
            <Label className="text-xs">FAA Registration</Label>
            <Input value={form.faa_registration} onChange={e => setForm(f => ({ ...f, faa_registration: e.target.value }))} placeholder="FA3..." />
          </div>
          <div>
            <Label className="text-xs">Firmware Version</Label>
            <Input value={form.firmware_version} onChange={e => setForm(f => ({ ...f, firmware_version: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Purchase Date</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Insurance Expiry</Label>
              <Input type="date" value={form.insurance_expiry} onChange={e => setForm(f => ({ ...f, insurance_expiry: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
              </SelectContent>
            </Select>
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
            {isEdit ? 'Save Changes' : 'Add Aircraft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
