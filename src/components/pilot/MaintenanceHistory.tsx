import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Wrench, Calendar, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MaintenanceLogEntry } from '@/types/fleet';

const TYPE_BADGE: Record<string, string> = {
  scheduled: 'bg-blue-500 text-white',
  unscheduled: 'bg-amber-500 text-white',
  repair: 'bg-red-500 text-white',
  inspection: 'bg-purple-500 text-white',
  firmware_update: 'bg-cyan-500 text-white',
  calibration: 'bg-green-500 text-white',
};

export default function MaintenanceHistory() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['maintenance-log-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_log')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as MaintenanceLogEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/pilot/fleet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Maintenance Log</h1>
            <p className="text-xs text-muted-foreground">All fleet maintenance records</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No maintenance records yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Log maintenance from the Fleet Inventory page
            </p>
          </div>
        ) : (
          entries.map(entry => (
            <Card key={entry.id}>
              <CardContent className="pt-3 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={TYPE_BADGE[entry.maintenance_type] || 'bg-gray-500 text-white'}>
                      {entry.maintenance_type.replace('_', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {entry.equipment_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(entry.performed_at).toLocaleDateString()}
                  </div>
                </div>

                {entry.description && (
                  <p className="text-sm">{entry.description}</p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {entry.cost_cents != null && entry.cost_cents > 0 && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${(entry.cost_cents / 100).toFixed(2)}
                    </span>
                  )}
                  {entry.parts_used?.length ? (
                    <span>Parts: {entry.parts_used.join(', ')}</span>
                  ) : null}
                  {entry.next_due_date && (
                    <span>Next due: {new Date(entry.next_due_date).toLocaleDateString()}</span>
                  )}
                </div>

                {entry.notes && (
                  <p className="text-xs text-muted-foreground italic">{entry.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
