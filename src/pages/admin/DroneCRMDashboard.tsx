import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminNav from "./components/AdminNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, FunnelChart, Funnel, LabelList
} from "recharts";
import { 
  Users, Mail, DollarSign, TrendingUp, Target, Zap, 
  Calendar, CheckCircle, Clock 
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

const FUNNEL_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-1))'];

export default function DroneCRMDashboard() {
  // Fetch leads for pipeline data
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['crm-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_leads')
        .select('id, status, email, created_at, portfolio_type, city');
      if (error) throw error;
      return data;
    },
  });

  // Fetch engagements for revenue data
  const { data: engagements = [], isLoading: engagementsLoading } = useQuery({
    queryKey: ['crm-engagements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_engagements')
        .select('id, engagement_date, actual_revenue, engagement_type, status');
      if (error) throw error;
      return data;
    },
  });

  // Fetch lead gen jobs for performance data
  const { data: leadGenJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['crm-lead-gen-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_gen_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const isLoading = leadsLoading || engagementsLoading || jobsLoading;

  // Calculate pipeline funnel data
  const pipelineData = [
    { name: 'New', value: leads.filter(l => l.status === 'new').length, fill: FUNNEL_COLORS[0] },
    { name: 'Contacted', value: leads.filter(l => l.status === 'contacted').length, fill: FUNNEL_COLORS[1] },
    { name: 'Responded', value: leads.filter(l => l.status === 'responded').length, fill: FUNNEL_COLORS[2] },
    { name: 'Qualified', value: leads.filter(l => l.status === 'qualified').length, fill: FUNNEL_COLORS[3] },
    { name: 'Client', value: leads.filter(l => l.status === 'client').length, fill: FUNNEL_COLORS[4] },
  ];

  // Calculate leads by type (pie chart)
  const typeGroups = leads.reduce((acc, lead) => {
    const type = lead.portfolio_type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const leadsByType = Object.entries(typeGroups)
    .map(([name, value]) => ({ name: name.split(' ').slice(0, 2).join(' '), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Calculate revenue by month (line chart)
  const revenueByMonth = engagements.reduce((acc, eng) => {
    if (eng.actual_revenue && eng.engagement_date) {
      const month = format(new Date(eng.engagement_date), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + eng.actual_revenue;
    }
    return acc;
  }, {} as Record<string, number>);

  const revenueData = Object.entries(revenueByMonth)
    .map(([month, revenue]) => ({ month, revenue }))
    .slice(-6);

  // Calculate engagement types (bar chart)
  const engagementTypes = engagements.reduce((acc, eng) => {
    acc[eng.engagement_type] = (acc[eng.engagement_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const engagementTypeData = Object.entries(engagementTypes)
    .map(([type, count]) => ({ type: type.charAt(0).toUpperCase() + type.slice(1), count }));

  // Lead gen job performance
  const totalLeadsGenerated = leadGenJobs.reduce((sum, job) => sum + (job.leads_created || 0), 0);
  const totalEmailsFound = leadGenJobs.reduce((sum, job) => sum + (job.emails_found || 0), 0);
  const totalSearches = leadGenJobs.reduce((sum, job) => sum + (job.searches_performed || 0), 0);

  // Stats calculations
  const totalLeads = leads.length;
  const leadsWithEmail = leads.filter(l => l.email).length;
  const emailRate = totalLeads > 0 ? Math.round((leadsWithEmail / totalLeads) * 100) : 0;
  const clientCount = leads.filter(l => l.status === 'client').length;
  const conversionRate = totalLeads > 0 ? Math.round((clientCount / totalLeads) * 100) : 0;
  const totalRevenue = engagements.reduce((sum, e) => sum + (e.actual_revenue || 0), 0);
  const thisMonthStart = startOfMonth(new Date());
  const thisMonthRevenue = engagements
    .filter(e => e.engagement_date && new Date(e.engagement_date) >= thisMonthStart)
    .reduce((sum, e) => sum + (e.actual_revenue || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Drone CRM Dashboard</h1>
          <p className="text-muted-foreground">Lead generation performance and revenue insights</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalLeads}</p>
                      <p className="text-sm text-muted-foreground">Total Leads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Mail className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{emailRate}%</p>
                      <p className="text-sm text-muted-foreground">Email Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{conversionRate}%</p>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
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
                      <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              {/* Pipeline Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pipeline Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={pipelineData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {pipelineData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Leads by Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leads by Industry</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={leadsByType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          {leadsByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))' 
                          }} 
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-6 md:grid-cols-2 mb-6">
              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))' 
                            }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No revenue data yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Types */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Engagements by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {engagementTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={engagementTypeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="type" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))' 
                            }} 
                          />
                          <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No engagements yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lead Gen Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Lead Generation Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4 mb-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{leadGenJobs.length}</p>
                    <p className="text-sm text-muted-foreground">Jobs Run</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{totalSearches}</p>
                    <p className="text-sm text-muted-foreground">Searches</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{totalLeadsGenerated}</p>
                    <p className="text-sm text-muted-foreground">Leads Created</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{totalEmailsFound}</p>
                    <p className="text-sm text-muted-foreground">Emails Found</p>
                  </div>
                </div>

                {leadGenJobs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">Recent Jobs</h4>
                    {leadGenJobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={job.status === 'completed' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
                          <span className="text-sm">
                            {format(new Date(job.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{job.searches_performed} searches</span>
                          <span>{job.leads_created} leads</span>
                          <span>{job.emails_found} emails</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
