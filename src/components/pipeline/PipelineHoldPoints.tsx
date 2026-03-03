import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PauseCircle, Eye } from 'lucide-react';
import PipelineStepper from './PipelineStepper';
import type { PipelineStep } from './PipelineStepper';
import type { PipelineJobRow, ProcessingJobStep } from '@/types/pipeline';
import { useResumeManualEdit } from '@/hooks/usePipeline';
import { useToast } from '@/hooks/use-toast';

interface PipelineHoldPointsProps {
  holdPoints: PipelineJobRow[];
}

export default function PipelineHoldPoints({ holdPoints }: PipelineHoldPointsProps) {
  const { toast } = useToast();
  const resumeManualEdit = useResumeManualEdit();

  if (holdPoints.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No jobs on hold
      </div>
    );
  }

  const handleMarkEditComplete = async (jobId: string, stepName: string, notes?: string) => {
    try {
      await resumeManualEdit.mutateAsync({ processingJobId: jobId, stepName, notes });
      toast({ title: 'Pipeline resumed', description: 'Continuing after manual edit.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Resume failed', description: message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {holdPoints.map((job) => {
        const droneJob = job.drone_jobs;
        const steps = (job.steps ?? []) as ProcessingJobStep[];
        const holdStep = steps.find((s) => s.status === 'awaiting_manual_edit');
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

        return (
          <Card key={job.id} className="border-amber-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PauseCircle className="h-4 w-4 text-amber-600" />
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
                  {holdStep && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      {holdStep.label ?? holdStep.name}
                    </Badge>
                  )}
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
                onMarkEditComplete={(stepName, notes) =>
                  handleMarkEditComplete(job.id, stepName, notes)
                }
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
