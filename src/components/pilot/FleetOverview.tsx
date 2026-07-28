import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Plane, Battery, Gamepad2, Package,
  Shield, Clock, Wrench, Plus, Pencil, Trash2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAllAircraft, useAllBatteries, useAllControllers, useAllAccessories } from '@/hooks/useFleet';
import { useDeleteAircraft, useDeleteBattery, useDeleteController } from '@/hooks/useFleetMutations';
import AircraftFormDialog from './AircraftFormDialog';
import BatteryFormDialog from './BatteryFormDialog';
import ControllerFormDialog from './ControllerFormDialog';
import MaintenanceLogDialog from './MaintenanceLogDialog';
import AccessoriesManager from '@/components/admin/AccessoriesManager';
import PageShell from '@/components/admin/PageShell';
import { LoadingState } from '@/components/admin/PageState';
import type { Aircraft, Battery as BatteryType, Controller, EquipmentType } from '@/types/fleet';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500 text-white',
  maintenance: 'bg-amber-500 text-white',
  retired: 'bg-gray-500 text-white',
  planned: 'bg-blue-500 text-white',
  lost: 'bg-red-500 text-white',
};

export default function FleetOverview() {
  const { toast } = useToast();
  const inAdmin = useLocation().pathname.startsWith('/admin');
  const { data: aircraft, isLoading: loadingAircraft } = useAllAircraft();
  const { data: batteries, isLoading: loadingBatteries } = useAllBatteries();
  const { data: controllers, isLoading: loadingControllers } = useAllControllers();
  const { data: accessories, isLoading: loadingAccessories } = useAllAccessories();

  const deleteAircraft = useDeleteAircraft();
  const deleteBattery = useDeleteBattery();
  const deleteController = useDeleteController();

  // Dialog states
  const [aircraftDialog, setAircraftDialog] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
  const [batteryDialog, setBatteryDialog] = useState(false);
  const [editingBattery, setEditingBattery] = useState<BatteryType | null>(null);
  const [controllerDialog, setControllerDialog] = useState(false);
  const [editingController, setEditingController] = useState<Controller | null>(null);
  // Accessories are owned by AccessoriesManager; this only nudges it to open
  // its create form from the section header.
  const [accessoryAddSignal, setAccessoryAddSignal] = useState(0);

  // Delete confirmation — accessories handle their own, because deletion there
  // has to surface the "referenced by N missions" guard from the RPC.
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'aircraft' | 'battery' | 'controller'; id: string; name: string } | null>(null);

  // Maintenance log
  const [maintenanceTarget, setMaintenanceTarget] = useState<{ id: string; type: EquipmentType; name: string } | null>(null);

  const isLoading = loadingAircraft || loadingBatteries || loadingControllers || loadingAccessories;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'aircraft') await deleteAircraft.mutateAsync(deleteTarget.id);
      else if (deleteTarget.type === 'battery') await deleteBattery.mutateAsync(deleteTarget.id);
      else await deleteController.mutateAsync(deleteTarget.id);
      toast({ title: `${deleteTarget.type} deleted` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast({ title: 'Delete failed', description: message, variant: 'destructive' });
    }
    setDeleteTarget(null);
  };

  const body = (
    <>
        {isLoading ? (
          <LoadingState variant="cards" rows={3} label="Loading fleet inventory" />
        ) : (
          <>
            {/* Aircraft */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Aircraft</h2>
                  <Badge variant="secondary">{aircraft?.length || 0}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setEditingAircraft(null); setAircraftDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-3">
                {aircraft?.map(a => (
                  <Card key={a.id}>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{a.nickname || a.model}</span>
                          {a.nickname && (
                            <span className="text-sm text-muted-foreground ml-2">{a.model}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={STATUS_BADGE[a.status] || 'bg-gray-400 text-white'}>
                            {a.status}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingAircraft(a); setAircraftDialog(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'aircraft', id: a.id, name: a.nickname || a.model })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>S/N: {a.serial_number}</div>
                        {a.faa_registration && <div>FAA: {a.faa_registration}</div>}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {a.total_flight_hours}h / {a.total_flights} flights
                        </div>
                        {a.firmware_version && (
                          <div className="flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            FW {a.firmware_version}
                          </div>
                        )}
                      </div>
                      {a.insurance_expiry && (
                        <div className="flex items-center gap-1 text-xs">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Insurance: {new Date(a.insurance_expiry).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-1 text-xs"
                        onClick={() => setMaintenanceTarget({ id: a.id, type: 'aircraft', name: a.nickname || a.model })}
                      >
                        <Wrench className="h-3 w-3 mr-1" /> Log Maintenance
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {!aircraft?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No aircraft in fleet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Batteries */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Battery className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Batteries</h2>
                  <Badge variant="secondary">{batteries?.length || 0}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setEditingBattery(null); setBatteryDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {batteries?.map(b => (
                  <Card key={b.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{b.serial_number}</span>
                          {b.model && (
                            <span className="text-xs text-muted-foreground ml-2">{b.model}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={b.health_percentage > 80 ? 'secondary' : b.health_percentage > 50 ? 'outline' : 'destructive'}
                            className="text-xs"
                          >
                            {b.health_percentage}%
                          </Badge>
                          <Badge className={STATUS_BADGE[b.status] || 'bg-gray-400 text-white'}>
                            {b.status}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingBattery(b); setBatteryDialog(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'battery', id: b.id, name: b.serial_number })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>{b.capacity_mah} mAh</span>
                        <span>{b.cycle_count} cycles</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!batteries?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No batteries in fleet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Controllers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Controllers</h2>
                  <Badge variant="secondary">{controllers?.length || 0}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setEditingController(null); setControllerDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {controllers?.map(c => (
                  <Card key={c.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{c.model}</span>
                          <span className="text-xs text-muted-foreground ml-2">{c.serial_number}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge className={STATUS_BADGE[c.status] || 'bg-gray-400 text-white'}>
                            {c.status}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingController(c); setControllerDialog(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'controller', id: c.id, name: c.model })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {c.firmware_version && (
                        <div className="text-xs text-muted-foreground mt-1">
                          FW {c.firmware_version}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {!controllers?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">No controllers in fleet</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Accessories — rendered by the SAME component as
                /admin/settings/accessories. There is no second implementation
                and no second form dialog to drift out of sync. */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <h2 className="text-lg font-semibold">Accessories</h2>
                  <Badge variant="secondary">{accessories?.length || 0}</Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAccessoryAddSignal(n => n + 1)}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <AccessoriesManager
                openFormSignal={accessoryAddSignal}
                onLogMaintenance={acc =>
                  setMaintenanceTarget({ id: acc.id, type: 'accessory', name: acc.name })
                }
              />
            </div>
          </>
        )}

      {/* Form Dialogs */}
      <AircraftFormDialog
        open={aircraftDialog}
        onOpenChange={setAircraftDialog}
        aircraft={editingAircraft}
      />
      <BatteryFormDialog
        open={batteryDialog}
        onOpenChange={setBatteryDialog}
        battery={editingBattery}
      />
      <ControllerFormDialog
        open={controllerDialog}
        onOpenChange={setControllerDialog}
        controller={editingController}
      />

      {/* Maintenance Log Dialog */}
      {maintenanceTarget && (
        <MaintenanceLogDialog
          open={!!maintenanceTarget}
          onOpenChange={() => setMaintenanceTarget(null)}
          equipmentId={maintenanceTarget.id}
          equipmentType={maintenanceTarget.type}
          equipmentName={maintenanceTarget.name}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteTarget?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  // One component, two homes: /pilot/fleet keeps the mobile-first back-arrow
  // header, /admin/settings/fleet gets the shared admin page frame. Deciding
  // from the pathname avoids a duplicate component whose only difference is
  // chrome — which is exactly how Accessories and Fleet drifted apart before.
  if (inAdmin) {
    return (
      <PageShell
        title="Fleet Inventory"
        description="Aircraft, batteries, controllers and accessories"
        icon={Plane}
        breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Fleet" }]}
        width="wide"
        actions={
          // Stays inside the admin shell. This used to point at
          // /pilot/fleet/maintenance, which dropped the admin out of their own
          // portal with no route back — the pilot page's only Back link goes to
          // /pilot/fleet.
          <Link to="/admin/settings/fleet/maintenance">
            <Button variant="outline" size="sm">
              <Wrench className="h-4 w-4 mr-1" /> History
            </Button>
          </Link>
        }
      >
        <div className="space-y-6">{body}</div>
      </PageShell>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/pilot">
            <Button variant="ghost" size="icon" aria-label="Back to pilot portal">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Fleet Inventory</h1>
            <p className="text-xs text-muted-foreground">Aircraft, batteries, controllers &amp; accessories</p>
          </div>
          <Link to="/pilot/fleet/maintenance">
            <Button variant="outline" size="sm">
              <Wrench className="h-4 w-4 mr-1" /> History
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">{body}</main>
    </div>
  );
}
