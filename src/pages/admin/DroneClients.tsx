import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, DollarSign, Calendar, Star, Building2, 
  MapPin, TrendingUp, Plus 
} from "lucide-react";
import { format } from "date-fns";
import EngagementFormModal from "./components/EngagementFormModal";

interface ClientSummary {
  id: string;
  company_name: string;
  city: string | null;
  portfolio_type: string | null;
  total_engagements: number;
  engagements_this_month: number;
  total_revenue: number | null;
  avg_satisfaction: number | null;
  last_engagement: string | null;
  next_scheduled: string | null;
}

export default function DroneClients() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showEngagementForm, setShowEngagementForm] = useState(false);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['drone-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_client_summary')
        .select('*');
      if (error) throw error;
      return data as ClientSummary[];
    },
  });

  const { data: engagementStats } = useQuery({
    queryKey: ['engagement-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_engagements')
        .select('actual_revenue, engagement_date, satisfaction_score')
        .gte('engagement_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]);
      if (error) throw error;
      
      const totalRevenue = data.reduce((sum, e) => sum + (e.actual_revenue || 0), 0);
      const avgSatisfaction = data.filter(e => e.satisfaction_score).length > 0
        ? data.reduce((sum, e) => sum + (e.satisfaction_score || 0), 0) / data.filter(e => e.satisfaction_score).length
        : 0;
      
      return {
        count: data.length,
        revenue: totalRevenue,
        satisfaction: avgSatisfaction,
      };
    },
  });

  const activeClients = clients.length;
  const totalRevenueAllTime = clients.reduce((sum, c) => sum + (c.total_revenue || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Drone Clients</h1>
            <p className="text-muted-foreground">Track client engagements and revenue</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeClients}</p>
                  <p className="text-sm text-muted-foreground">Active Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{engagementStats?.count || 0}</p>
                  <p className="text-sm text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${(engagementStats?.revenue || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Revenue (Month)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Star className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {engagementStats?.satisfaction ? engagementStats.satisfaction.toFixed(1) : '-'}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Satisfaction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No clients yet.</p>
                <p className="text-sm">Convert leads to clients to see them here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Engagements</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead className="text-center">Satisfaction</TableHead>
                    <TableHead>Last Engagement</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.company_name}</TableCell>
                      <TableCell>
                        {client.city && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {client.city}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.portfolio_type && (
                          <Badge variant="outline">{client.portfolio_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-medium">{client.total_engagements}</span>
                          {client.engagements_this_month > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{client.engagements_this_month}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${(client.total_revenue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {client.avg_satisfaction ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            {client.avg_satisfaction.toFixed(1)}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {client.last_engagement ? (
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(client.last_engagement), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClientId(client.id);
                            setShowEngagementForm(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {showEngagementForm && selectedClientId && (
          <EngagementFormModal
            leadId={selectedClientId}
            open={showEngagementForm}
            onClose={() => {
              setShowEngagementForm(false);
              setSelectedClientId(null);
            }}
          />
        )}
      </main>
    </div>
  );
}
