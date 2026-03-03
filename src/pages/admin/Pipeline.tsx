import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import AdminNav from './components/AdminNav';
import PipelineActiveJobs from '@/components/pipeline/PipelineActiveJobs';
import PipelineHoldPoints from '@/components/pipeline/PipelineHoldPoints';
import PipelineHistory from '@/components/pipeline/PipelineHistory';
import N8nHealthIndicator from '@/components/pipeline/N8nHealthIndicator';
import {
  useActiveProcessingJobs,
  useCompletedProcessingJobs,
  useHoldPointJobs,
  usePipelineRealtime,
} from '@/hooks/usePipeline';

export default function Pipeline() {
  const { data: activeJobs = [] } = useActiveProcessingJobs();
  const { data: completedJobs = [] } = useCompletedProcessingJobs();
  const { data: holdJobs = [] } = useHoldPointJobs();
  usePipelineRealtime();

  const runningJobs = activeJobs.filter((j) => j.status === 'running' || j.status === 'pending');
  const failedJobs = completedJobs.filter((j) => j.status === 'failed');
  const completedToday = completedJobs.filter((j) => {
    if (j.status !== 'complete' || !j.completed_at) return false;
    const d = new Date(j.completed_at);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pipeline</h1>
              <p className="text-sm text-muted-foreground">
                Sentinel processing orchestrator
              </p>
            </div>
          </div>
          <N8nHealthIndicator />
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-blue-100 p-2">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{runningJobs.length}</div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-orange-100 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{holdJobs.length}</div>
                <div className="text-sm text-muted-foreground">On Hold</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedToday.length}</div>
                <div className="text-sm text-muted-foreground">Today</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-red-100 p-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{failedJobs.length}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs — 3 tabs, all Model 2 */}
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active {activeJobs.length > 0 && `(${activeJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="hold">
              Hold Points {holdJobs.length > 0 && `(${holdJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <PipelineActiveJobs jobs={activeJobs} />
          </TabsContent>

          <TabsContent value="hold">
            <PipelineHoldPoints holdPoints={holdJobs} />
          </TabsContent>

          <TabsContent value="history">
            <PipelineHistory jobs={completedJobs} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
