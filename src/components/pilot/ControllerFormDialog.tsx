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
import { useCreateController, useUpdateController } from '@/hooks/useFleetMutations';
import { useAllAircraft } from '@/hooks/useFleet';
import type { Controller } from '@/types/fleet';

interface ControllerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controller?: Controller | null;
}

export default function ControllerFormDialog({ open, onOpenChange, controller }: ControllerFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateController();
  const updateMutation = useUpdateController();
  const { data: aircraft } = useAllAircraft();
  const isEdit = !!controller;

  const [form, setForm] = useState({
    model: '',
    serial_number: '',
    firmware_version: '',
    paired_aircraft_id: '',
    status: 'active',
    notes: '',
  });

  useEffect(() => {
    if (controller) {
      setForm({
        model: controller.model || '',
        serial_number: controller.serial_number || '',
        firmware_version: controller.firmware_version || '',
        paired_aircraft_id: controller.paired_aircraft_id || '',
        status: controller.status || 'active',
        notes: controller.notes || '',
      });
    } else {
      setForm({
        model: '',
        serial_number: '',
        firmware_version: '',
        paired_aircraft_id: '',
        status: 'active',
        notes: '',
      });
    }
  }, [controller, open]);

  const handleSubmit = async () => {
    if (!form.model.trim() || !form.serial_number.trim()) {
      toast({ title: 'Model and serial number are required', variant: 'destructive' });
      return;
    }

    const payload = {
      model: form.model,
      serial_number: form.serial_number,
      firmware_version: form.firmware_version || null,
      paired_aircraft_id: form.paired_aircraft_id || null,
      status: form.status,
      notes: form.notes || null,
    };

    try {
      if (isEdit && controller) {
        await updateMutation.mutateAsync({ id: controller.id, ...payload });
        toast({ title: 'Controller updated' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Controller added' });
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
          <DialogTitle>{isEdit ? 'Edit Controller' : 'Add Controller'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Model *</Label>
            <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="DJI RC Plus 2" />
          </div>
          <div>
            <Label className="text-xs">Serial Number *</Label>
            <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Firmware Version</Label>
            <Input value={form.firmware_version} onChange={e => setForm(f => ({ ...f, firmware_version: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Paired Aircraft</Label>
            <Select value={form.paired_aircraft_id} onValueChange={v => setForm(f => ({ ...f, paired_aircraft_id: v }))}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {aircraft?.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.nickname || a.model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Add Controller'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
