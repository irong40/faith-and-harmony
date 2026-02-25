import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import N8nHealthIndicator from "@/components/pipeline/N8nHealthIndicator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Server,
  XCircle
} from "lucide-react";

export default function Dashboard() {
  const { data: apps, isLoading: appsLoading } = useQuery({
    queryKey: ["apps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apps")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["maintenance-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["maintenance-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_logs")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const ticketStats = {
    open: tickets?.filter((t) => t.status === "open").length || 0,
    inProgress: tickets?.filter((t) => t.status === "in-progress").length || 0,
    resolved: tickets?.filter((t) => t.status === "resolved").length || 0,
    total: tickets?.length || 0,
  };

  const priorityStats = {
    critical: tickets?.filter((t) => t.priority === "critical").length || 0,
    high: tickets?.filter((t) => t.priority === "high").length || 0,
    medium: tickets?.filter((t) => t.priority === "medium").length || 0,
    low: tickets?.filter((t) => t.priority === "low").length || 0,
  };

  const totalHours = logs?.reduce((sum, log) => sum + Number(log.hours), 0) || 0;
  const hoursByType = logs?.reduce((acc, log) => {
    acc[log.type] = (acc[log.type] || 0) + Number(log.hours);
    return acc;
  }, {} as Record<string, number>) || {};

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "offline":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Online</Badge>;
      case "degraded":
        return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Degraded</Badge>;
      case "offline":
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isLoading = appsLoading || ticketsLoading || logsLoading;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">Mission Control</h1>
            <N8nHealthIndicator />
          </div>
          <p className="text-muted-foreground mt-1">
            Overview of all apps, tickets, and maintenance activity
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{apps?.length || 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{ticketStats.open}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-destructive">
                  {priorityStats.critical}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* App Health Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                App Health Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : apps && apps.length > 0 ? (
                <div className="space-y-3">
                  {apps.map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(app.status)}
                        <div>
                          <p className="font-medium">{app.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {app.code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {app.version && (
                          <span className="text-sm text-muted-foreground">
                            v{app.version}
                          </span>
                        )}
                        {getStatusBadge(app.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No apps configured yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Ticket Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ticket Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-2xl font-bold text-yellow-600">
                        {ticketStats.open}
                      </p>
                      <p className="text-sm text-muted-foreground">Open</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-2xl font-bold text-blue-600">
                        {ticketStats.inProgress}
                      </p>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-2xl font-bold text-green-600">
                        {ticketStats.resolved}
                      </p>
                      <p className="text-sm text-muted-foreground">Resolved</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-3">By Priority</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Critical</span>
                        <Badge variant="destructive">{priorityStats.critical}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">High</span>
                        <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                          {priorityStats.high}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Medium</span>
                        <Badge variant="secondary">{priorityStats.medium}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Low</span>
                        <Badge variant="outline">{priorityStats.low}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Hours */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Maintenance Hours by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : Object.keys(hoursByType).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(hoursByType).map(([type, hours]) => (
                    <div
                      key={type}
                      className="p-4 rounded-lg border bg-card text-center"
                    >
                      <p className="text-2xl font-bold">{hours.toFixed(1)}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {type.replace(/-/g, " ")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No maintenance logs recorded yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
