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
import { useCreateAccessory, useUpdateAccessory } from '@/hooks/useFleetMutations';
import type { Accessory } from '@/types/fleet';

interface AccessoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessory?: Accessory | null;
}

const ACCESSORY_TYPES = [
  { value: 'filter', label: 'Filter' },
  { value: 'lens', label: 'Lens' },
  { value: 'propeller', label: 'Propeller' },
  { value: 'case', label: 'Case' },
  { value: 'charger', label: 'Charger' },
  { value: 'antenna', label: 'Antenna' },
  { value: 'mount', label: 'Mount' },
  { value: 'other', label: 'Other' },
];

export default function AccessoryFormDialog({ open, onOpenChange, accessory }: AccessoryFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateAccessory();
  const updateMutation = useUpdateAccessory();
  const isEdit = !!accessory;

  const [form, setForm] = useState({
    name: '',
    type: 'other',
    serial_number: '',
    compatible_aircraft: '' as string,
    status: 'active',
    purchase_date: '',
    notes: '',
  });

  useEffect(() => {
    if (accessory) {
      setForm({
        name: accessory.name || '',
        type: accessory.type || 'other',
        serial_number: accessory.serial_number || '',
        compatible_aircraft: accessory.compatible_aircraft?.join(', ') || '',
        status: accessory.status || 'active',
        purchase_date: '',
        notes: accessory.notes || '',
      });
    } else {
      setForm({
        name: '',
        type: 'other',
        serial_number: '',
        compatible_aircraft: '',
        status: 'active',
        purchase_date: '',
        notes: '',
      });
    }
  }, [accessory, open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    const compatibleList = typeof form.compatible_aircraft === 'string'
      ? form.compatible_aircraft.split(',').map(s => s.trim()).filter(Boolean)
      : form.compatible_aircraft;

    const payload = {
      name: form.name,
      type: form.type,
      serial_number: form.serial_number || null,
      compatible_aircraft: compatibleList.length > 0 ? compatibleList : null,
      status: form.status,
      purchase_date: form.purchase_date || null,
      notes: form.notes || null,
    };

    try {
      if (isEdit && accessory) {
        await updateMutation.mutateAsync({ id: accessory.id, ...payload });
        toast({ title: 'Accessory updated' });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Accessory added' });
      }
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Accessory' : 'Add Accessory'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ND16 Filter" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCESSORY_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Serial Number</Label>
            <Input value={form.serial_number} onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Compatible Aircraft</Label>
            <Input
              value={form.compatible_aircraft}
              onChange={e => setForm(f => ({ ...f, compatible_aircraft: e.target.value }))}
              placeholder="Matrice 4E, Mavic 3 Enterprise"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma separated model names</p>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
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
            {isEdit ? 'Save Changes' : 'Add Accessory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
