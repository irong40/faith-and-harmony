import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plane, Battery, Gamepad2, Package, CheckCircle2, AlertTriangle, Thermometer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useActiveAircraft, useActiveBatteries, useActiveControllers, useAircraftCapabilities, useAllAccessories } from '@/hooks/useFleet';
import { useMissionEquipment, useUpsertMissionEquipment } from '@/hooks/useMissionEquipment';

interface EquipmentSelectorProps {
  missionId: string;
  packageId: string | null;
  packageCode: string | null;
  requiresThermal?: boolean;
  onEquipmentSelected: (data: { id: string; aircraft_model: string }) => void;
  onEquipmentCleared: () => void;
}

// Known thermal-capable aircraft models
const THERMAL_CAPABLE_MODELS = ['DJI Matrice 4T', 'DJI Mavic 3T', 'DJI Mavic 3 Enterprise'];

export default function EquipmentSelector({
  missionId,
  packageId,
  packageCode,
  requiresThermal = false,
  onEquipmentSelected,
  onEquipmentCleared,
}: EquipmentSelectorProps) {
  const { toast } = useToast();

  // Data queries
  const { data: allAircraft, isLoading: loadingAircraft } = useActiveAircraft();
  const { data: capabilities } = useAircraftCapabilities(packageId);
  const { data: controllers } = useActiveControllers();
  const { data: accessories } = useAllAccessories();
  const { data: savedEquipment, isLoading: loadingSaved } = useMissionEquipment(missionId);
  const upsertMutation = useUpsertMissionEquipment();

  // Selection state
  const [selectedAircraftId, setSelectedAircraftId] = useState<string>('');
  const [selectedBatteryIds, setSelectedBatteryIds] = useState<string[]>([]);
  const [selectedControllerId, setSelectedControllerId] = useState<string>('');
  const [selectedAccessoryIds, setSelectedAccessoryIds] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Get batteries filtered by selected aircraft
  const { data: batteries } = useActiveBatteries(selectedAircraftId || null);

  // Filter aircraft by capabilities if package is set
  const capableAircraftIds = capabilities?.map(c => c.aircraft_id) || [];
  const filteredAircraft = packageId && capableAircraftIds.length > 0
    ? (allAircraft || []).filter(a => capableAircraftIds.includes(a.id))
    : (allAircraft || []);

  // Auto-select controller when aircraft changes
  useEffect(() => {
    if (!selectedAircraftId || !controllers) return;
    const paired = controllers.find(c => c.paired_aircraft_id === selectedAircraftId);
    if (paired) {
      setSelectedControllerId(paired.id);
    } else {
      setSelectedControllerId('');
    }
  }, [selectedAircraftId, controllers]);

  // Restore saved equipment
  useEffect(() => {
    if (!savedEquipment) return;
    setSelectedAircraftId(savedEquipment.aircraft_id);
    setSelectedBatteryIds(savedEquipment.battery_ids || []);
    setSelectedAccessoryIds(savedEquipment.accessory_ids || []);
    if (savedEquipment.controller_id) {
      setSelectedControllerId(savedEquipment.controller_id);
    }
    // Notify parent
    const aircraft = allAircraft?.find(a => a.id === savedEquipment.aircraft_id);
    if (aircraft) {
      onEquipmentSelected({ id: savedEquipment.id, aircraft_model: aircraft.model });
    }
  }, [savedEquipment, allAircraft]);

  const handleAircraftChange = (value: string) => {
    setSelectedAircraftId(value);
    setSelectedBatteryIds([]);
    setSelectedAccessoryIds([]);
    onEquipmentCleared();
  };

  const handleBatteryToggle = (batteryId: string) => {
    setSelectedBatteryIds(prev =>
      prev.includes(batteryId)
        ? prev.filter(id => id !== batteryId)
        : [...prev, batteryId]
    );
  };

  const handleAccessoryToggle = (accessoryId: string) => {
    setSelectedAccessoryIds(prev =>
      prev.includes(accessoryId)
        ? prev.filter(id => id !== accessoryId)
        : [...prev, accessoryId]
    );
  };

  // Filter accessories by compatibility with selected aircraft
  const selectedAircraft = filteredAircraft.find(a => a.id === selectedAircraftId);
  const availableAccessories = (accessories || []).filter(acc => {
    if (acc.status !== 'active') return false;
    if (!acc.compatible_aircraft || acc.compatible_aircraft.length === 0) return true;
    if (!selectedAircraft) return true;
    return acc.compatible_aircraft.includes(selectedAircraft.model);
  });

  const handleSave = async () => {
    if (!selectedAircraftId) return;

    try {
      const result = await upsertMutation.mutateAsync({
        mission_id: missionId,
        aircraft_id: selectedAircraftId,
        battery_ids: selectedBatteryIds,
        controller_id: selectedControllerId || null,
        accessory_ids: selectedAccessoryIds,
      });

      const aircraft = filteredAircraft.find(a => a.id === selectedAircraftId);
      onEquipmentSelected({ id: result.id, aircraft_model: aircraft?.model || '' });
      setIsEditing(false);

      toast({ title: 'Equipment saved' });
    } catch (error: any) {
      toast({
        title: 'Error saving equipment',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loadingAircraft || loadingSaved) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show saved summary if equipment already saved and not re-editing
  if (savedEquipment && !upsertMutation.isPending && !isEditing) {
    const aircraft = allAircraft?.find(a => a.id === savedEquipment.aircraft_id);
    const batteryCount = savedEquipment.battery_ids?.length || 0;
    const controller = controllers?.find(c => c.id === savedEquipment.controller_id);
    const accessoryCount = savedEquipment.accessory_ids?.length || 0;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Equipment Selected</span>
        </div>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-muted-foreground" />
            <span>{aircraft?.nickname || aircraft?.model || 'Unknown'}</span>
            {aircraft?.model && <Badge variant="secondary" className="text-xs">{aircraft.model}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Battery className="h-4 w-4 text-muted-foreground" />
            <span>{batteryCount} {batteryCount === 1 ? 'battery' : 'batteries'}</span>
          </div>
          {controller && (
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4 text-muted-foreground" />
              <span>{controller.model}</span>
            </div>
          )}
          {accessoryCount > 0 && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{accessoryCount} {accessoryCount === 1 ? 'accessory' : 'accessories'}</span>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          setIsEditing(true);
          onEquipmentCleared();
          setSelectedAircraftId(savedEquipment.aircraft_id);
          setSelectedBatteryIds(savedEquipment.battery_ids || []);
          if (savedEquipment.controller_id) setSelectedControllerId(savedEquipment.controller_id);
          setSelectedAccessoryIds(savedEquipment.accessory_ids || []);
        }}>
          Change Equipment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aircraft Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Plane className="h-4 w-4" />
          Aircraft
          {packageCode && (
            <Badge variant="outline" className="text-xs">
              Filtered for {packageCode}
            </Badge>
          )}
        </Label>
        {filteredAircraft.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No aircraft {packageCode ? `capable of ${packageCode} missions` : 'available'}
          </p>
        ) : (
          <Select value={selectedAircraftId} onValueChange={handleAircraftChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select aircraft..." />
            </SelectTrigger>
            <SelectContent>
              {filteredAircraft.map(aircraft => (
                <SelectItem key={aircraft.id} value={aircraft.id}>
                  {aircraft.nickname || aircraft.model} — {aircraft.serial_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Thermal Warning */}
      {requiresThermal && selectedAircraftId && selectedAircraft && !THERMAL_CAPABLE_MODELS.includes(selectedAircraft.model) && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <Thermometer className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-600">Thermal Camera Recommended</p>
            <p className="text-xs text-muted-foreground">
              This mission type requires thermal imaging. The selected aircraft ({selectedAircraft.model}) may not have a built-in thermal sensor. Verify an aftermarket thermal attachment is available.
            </p>
          </div>
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
        </div>
      )}

      {/* Battery Selection */}
      {selectedAircraftId && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Battery className="h-4 w-4" />
            Batteries
          </Label>
          {!batteries?.length ? (
            <p className="text-sm text-muted-foreground">No batteries available</p>
          ) : (
            <div className="space-y-2">
              {batteries.map(battery => (
                <div
                  key={battery.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedBatteryIds.includes(battery.id)
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-card border-border'
                  }`}
                  onClick={() => handleBatteryToggle(battery.id)}
                >
                  <Checkbox
                    checked={selectedBatteryIds.includes(battery.id)}
                    className="pointer-events-none"
                  />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{battery.serial_number}</span>
                    {battery.model && <span className="text-muted-foreground"> — {battery.model}</span>}
                  </div>
                  <Badge variant={battery.health_percentage > 80 ? 'secondary' : 'destructive'} className="text-xs">
                    {battery.health_percentage}% / {battery.cycle_count} cycles
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Controller (auto-populated) */}
      {selectedAircraftId && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4" />
            Controller
          </Label>
          {selectedControllerId ? (
            <div className="p-2 rounded-lg border bg-muted/50 text-sm">
              {controllers?.find(c => c.id === selectedControllerId)?.model || 'Paired controller'}
              <Badge variant="secondary" className="ml-2 text-xs">Auto-paired</Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No controller paired with selected aircraft
            </p>
          )}
        </div>
      )}

      {/* Accessories Selection */}
      {selectedAircraftId && availableAccessories.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Accessories
            <Badge variant="outline" className="text-xs">{selectedAccessoryIds.length} selected</Badge>
          </Label>
          <div className="space-y-2">
            {availableAccessories.map(acc => (
              <div
                key={acc.id}
                className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedAccessoryIds.includes(acc.id)
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card border-border'
                }`}
                onClick={() => handleAccessoryToggle(acc.id)}
              >
                <Checkbox
                  checked={selectedAccessoryIds.includes(acc.id)}
                  className="pointer-events-none"
                />
                <div className="flex-1 text-sm">
                  <span className="font-medium">{acc.name}</span>
                  <span className="text-muted-foreground ml-1 capitalize text-xs">{acc.type}</span>
                </div>
                {acc.serial_number && (
                  <Badge variant="secondary" className="text-xs">{acc.serial_number}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={!selectedAircraftId || upsertMutation.isPending}
        className="w-full"
      >
        {upsertMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Equipment'
        )}
      </Button>
    </div>
  );
}
