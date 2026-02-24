import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import AdminNav from './components/AdminNav';
import PipelineActiveJobs from '@/components/pipeline/PipelineActiveJobs';
import PipelineHoldPoints from '@/components/pipeline/PipelineHoldPoints';
import PipelineHistory from '@/components/pipeline/PipelineHistory';
import N8nHealthIndicator from '@/components/pipeline/N8nHealthIndicator';
import { usePipelineJobs, useHoldPointJobs, usePipelineRealtime } from '@/hooks/usePipeline';

export default function Pipeline() {
  const { data: allJobs = [] } = usePipelineJobs();
  const { data: holdPoints = [] } = useHoldPointJobs();
  usePipelineRealtime();

  const activeJobs = allJobs.filter((j) =>
    ['processing', 'uploaded', 'complete', 'review_pending', 'qa'].includes(j.status),
  );
  const failedJobs = allJobs.filter((j) => j.status === 'failed');
  const completedToday = allJobs.filter((j) => {
    if (j.status !== 'delivered') return false;
    const steps = j.processing_steps || [];
    const last = steps[steps.length - 1];
    if (!last?.completed_at) return false;
    const d = new Date(last.completed_at);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  // History = delivered + failed from the query set
  const historyJobs = allJobs.filter((j) =>
    ['delivered', 'failed'].includes(j.status),
  );

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
                <div className="text-2xl font-bold">{activeJobs.length}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-full bg-orange-100 p-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{holdPoints.length}</div>
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

        {/* Tabs */}
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active {activeJobs.length > 0 && `(${activeJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="hold">
              On Hold {holdPoints.length > 0 && `(${holdPoints.length})`}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardContent className="p-0">
                <PipelineActiveJobs jobs={activeJobs} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hold">
            <PipelineHoldPoints holdPoints={holdPoints} />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                <PipelineHistory jobs={historyJobs} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
