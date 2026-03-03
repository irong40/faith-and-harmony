import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Activity } from 'lucide-react';
import PipelineStepper from './PipelineStepper';
import type { PipelineStep } from './PipelineStepper';
import type { PipelineJobRow, ProcessingJobStep } from '@/types/pipeline';
import { useResumeManualEdit } from '@/hooks/usePipeline';
import { useToast } from '@/hooks/use-toast';

interface PipelineActiveJobsProps {
  jobs: PipelineJobRow[];
}

function JobCard({ job }: { job: PipelineJobRow }) {
  const { toast } = useToast();
  const resumeManualEdit = useResumeManualEdit();

  const steps = (job.steps ?? []) as ProcessingJobStep[];
  const pipelineSteps: PipelineStep[] = steps.map((s) => ({
    name: s.name,
    label: s.label,
    script: s.script ?? undefined,
    manual: s.manual,
    status: s.status,
    started_at: s.started_at,
    completed_at: s.completed_at,
    error: s.error,
    output: s.output,
  }));

  const handleMarkEditComplete = async (stepName: string, notes?: string) => {
    try {
      await resumeManualEdit.mutateAsync({ processingJobId: job.id, stepName, notes });
      toast({ title: 'Pipeline resumed', description: 'Continuing after manual edit.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Resume failed', description: message, variant: 'destructive' });
    }
  };

  const droneJob = job.drone_jobs;
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
          <CardTitle className="text-sm font-medium">
            {droneJob ? (
              <>
                <span className="font-mono">{droneJob.job_number}</span>
                <span className="ml-2 text-muted-foreground font-normal">
                  {droneJob.property_address}
                </span>
              </>
            ) : (
              <span className="font-mono">Job {job.mission_id.slice(0, 8)}...</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={statusBadgeClass}>
              {job.status.replace(/_/g, ' ')}
            </Badge>
            {droneJob && (
              <Link to={`/admin/drone-jobs/${droneJob.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
        {droneJob?.customers?.name && (
          <p className="text-xs text-muted-foreground">{droneJob.customers.name}</p>
        )}
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

export default function PipelineActiveJobs({ jobs }: PipelineActiveJobsProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Activity className="mx-auto h-10 w-10 mb-3 opacity-40" />
        <p>No active pipeline jobs</p>
        <p className="text-sm">Start processing from a job detail page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
