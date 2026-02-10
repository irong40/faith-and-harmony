import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Plane, Battery, Gamepad2, RefreshCw,
  Shield, Clock, Wrench
} from 'lucide-react';
import { useAllAircraft, useAllBatteries, useAllControllers } from '@/hooks/useFleet';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-500 text-white',
  maintenance: 'bg-amber-500 text-white',
  retired: 'bg-gray-500 text-white',
  planned: 'bg-blue-500 text-white',
};

export default function FleetOverview() {
  const { data: aircraft, isLoading: loadingAircraft } = useAllAircraft();
  const { data: batteries, isLoading: loadingBatteries } = useAllBatteries();
  const { data: controllers, isLoading: loadingControllers } = useAllControllers();

  const isLoading = loadingAircraft || loadingBatteries || loadingControllers;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/pilot">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Fleet Inventory</h1>
            <p className="text-xs text-muted-foreground">Aircraft, batteries & controllers</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Aircraft */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Plane className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Aircraft</h2>
                <Badge variant="secondary">{aircraft?.length || 0}</Badge>
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
                        <Badge className={STATUS_BADGE[a.status] || 'bg-gray-400 text-white'}>
                          {a.status}
                        </Badge>
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
              <div className="flex items-center gap-2 mb-3">
                <Battery className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Batteries</h2>
                <Badge variant="secondary">{batteries?.length || 0}</Badge>
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
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={b.health_percentage > 80 ? 'secondary' : b.health_percentage > 50 ? 'outline' : 'destructive'}
                            className="text-xs"
                          >
                            {b.health_percentage}%
                          </Badge>
                          <Badge className={STATUS_BADGE[b.status] || 'bg-gray-400 text-white'} >
                            {b.status}
                          </Badge>
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
              <div className="flex items-center gap-2 mb-3">
                <Gamepad2 className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Controllers</h2>
                <Badge variant="secondary">{controllers?.length || 0}</Badge>
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
                        <Badge className={STATUS_BADGE[c.status] || 'bg-gray-400 text-white'}>
                          {c.status}
                        </Badge>
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
          </>
        )}
      </main>
    </div>
  );
}
