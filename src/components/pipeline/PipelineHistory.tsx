import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import PipelineStepper from './PipelineStepper';
import type { PipelineStep } from './PipelineStepper';
import type { PipelineJobRow, ProcessingJobStep } from '@/types/pipeline';

interface PipelineHistoryProps {
  jobs: PipelineJobRow[];
}

export default function PipelineHistory({ jobs }: PipelineHistoryProps) {
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No completed or failed jobs
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const droneJob = job.drone_jobs;
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
        const completedCount = steps.filter((s) => s.status === 'complete').length;
        const completedAt = job.completed_at
          ? format(new Date(job.completed_at), 'MMM d, h:mm a')
          : null;
        const isSuccess = job.status === 'complete';

        return (
          <Card key={job.id} className={isSuccess ? '' : 'border-red-200'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  {droneJob ? (
                    <>
                      <span className="font-mono">{droneJob.job_number}</span>
                      <span className="text-muted-foreground font-normal">
                        {droneJob.property_address}
                      </span>
                    </>
                  ) : (
                    <span className="font-mono">Job {job.mission_id.slice(0, 8)}...</span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={
                      isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }
                  >
                    {job.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {completedCount}/{steps.length} steps
                    {completedAt && <> &middot; {completedAt}</>}
                  </span>
                  {droneJob && (
                    <Link to={`/admin/drone-jobs/${droneJob.id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PipelineStepper steps={pipelineSteps} currentStep={null} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
