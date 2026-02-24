import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import AdminNav from './components/AdminNav';
import PipelineActiveJobs from '@/components/pipeline/PipelineActiveJobs';
import PipelineHoldPoints from '@/components/pipeline/PipelineHoldPoints';
import PipelineHistory from '@/components/pipeline/PipelineHistory';
import N8nHealthIndicator from '@/components/pipeline/N8nHealthIndicator';
import PipelineStepper from '@/components/pipeline/PipelineStepper';
import type { PipelineStep } from '@/components/pipeline/PipelineStepper';
import {
  usePipelineJobs,
  useHoldPointJobs,
  usePipelineRealtime,
  useActiveProcessingJobs,
  useResumeManualEdit,
} from '@/hooks/usePipeline';
import type { ProcessingJobStep } from '@/hooks/usePipeline';
import { useToast } from '@/hooks/use-toast';

function ProcessingJobRow({ job }: { job: ReturnType<typeof useActiveProcessingJobs>['data'] extends Array<infer T> ? T : never }) {
  const { toast } = useToast();
  const resumeManualEdit = useResumeManualEdit();

  const steps = (job.steps ?? []) as ProcessingJobStep[];
  const pipelineSteps: PipelineStep[] = steps.map((s) => ({
    name: s.name,
    script: s.script ?? undefined,
    status: s.status,
    started_at: s.started_at,
    completed_at: s.completed_at,
    error: s.error,
    output: s.output,
  }));

  const handleMarkEditComplete = async (stepName: string) => {
    try {
      await resumeManualEdit.mutateAsync({ processingJobId: job.id, stepName });
      toast({ title: 'Pipeline resumed', description: 'Continuing after manual edit.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Resume failed', description: message, variant: 'destructive' });
    }
  };

  const statusBadgeClass =
    job.status === 'running'
      ? 'bg-blue-100 text-blue-700'
      : job.status === 'awaiting_manual_edit'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-600';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium font-mono">
            Job {job.mission_id.slice(0, 8)}...
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={statusBadgeClass}>
              {job.status.replace(/_/g, ' ')}
            </Badge>
            <Link to={`/admin/drone-jobs/${job.mission_id}`}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Eye className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <PipelineStepper
          steps={pipelineSteps}
          currentStep={job.current_step}
          processingJobId={job.id}
          onMarkEditComplete={handleMarkEditComplete}
        />
        {job.error_message && (
          <p className="mt-2 text-xs font-mono text-red-600">{job.error_message}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Pipeline() {
  const { data: allJobs = [] } = usePipelineJobs();
  const { data: holdPoints = [] } = useHoldPointJobs();
  const { data: activeProcessingJobs = [] } = useActiveProcessingJobs();
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

  const historyJobs = allJobs.filter((j) => ['delivered', 'failed'].includes(j.status));

  const runningJobs = activeProcessingJobs.filter((j) => j.status === 'running');
  const awaitingEditJobs = activeProcessingJobs.filter((j) => j.status === 'awaiting_manual_edit');

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
                <div className="text-2xl font-bold">{awaitingEditJobs.length + holdPoints.length}</div>
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
        <Tabs defaultValue="processing-jobs">
          <TabsList className="mb-4">
            <TabsTrigger value="processing-jobs">
              Processing Jobs {activeProcessingJobs.length > 0 && `(${activeProcessingJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active {activeJobs.length > 0 && `(${activeJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="hold">
              On Hold {(holdPoints.length + awaitingEditJobs.length) > 0 && `(${holdPoints.length + awaitingEditJobs.length})`}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Processing Jobs tab — real-time per-script status */}
          <TabsContent value="processing-jobs">
            {activeProcessingJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Activity className="mx-auto h-10 w-10 mb-3 opacity-40" />
                  <p>No active pipeline jobs</p>
                  <p className="text-sm">Start processing from a job detail page.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeProcessingJobs.map((job) => (
                  <ProcessingJobRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </TabsContent>

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
