import { CircleDashed, Loader2, CheckCircle2, XCircle, PauseCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StepStatus =
  | 'pending'
  | 'running'
  | 'complete'
  | 'failed'
  | 'awaiting_manual_edit';

export interface PipelineStep {
  name: string;
  script?: string;
  status: StepStatus;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
  output?: string | null;
}

interface PipelineStepperProps {
  steps: PipelineStep[];
  currentStep?: string | null;
  className?: string;
}

const STATUS_ICON: Record<StepStatus, React.ReactNode> = {
  pending: <CircleDashed className="h-5 w-5 text-slate-400" />,
  running: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />,
  complete: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  failed: <XCircle className="h-5 w-5 text-red-600" />,
  awaiting_manual_edit: <PauseCircle className="h-5 w-5 text-amber-600" />,
};

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  complete: 'Complete',
  failed: 'Failed',
  awaiting_manual_edit: 'Awaiting Edit',
};

const STATUS_BADGE_CLASS: Record<StepStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  running: 'bg-blue-100 text-blue-700',
  complete: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  awaiting_manual_edit: 'bg-amber-100 text-amber-700',
};

function formatDuration(startedAt: string | null | undefined, completedAt: string | null | undefined): string | null {
  if (!startedAt) return null;
  const end = completedAt ? new Date(completedAt) : new Date();
  const start = new Date(startedAt);
  const secs = Math.round((end.getTime() - start.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

export default function PipelineStepper({ steps, currentStep, className }: PipelineStepperProps) {
  if (steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.status === 'complete').length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{completedCount} of {steps.length} steps complete</span>
          <span>{progressPct}%</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      {/* Step list */}
      <ol className="space-y-2">
        {steps.map((step, idx) => {
          const isCurrent = step.name === currentStep || step.status === 'running';
          const duration = formatDuration(step.started_at, step.completed_at);

          return (
            <li
              key={`${step.name}-${idx}`}
              className={cn(
                'flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm',
                isCurrent && 'bg-blue-50 ring-1 ring-blue-200',
                step.status === 'failed' && 'bg-red-50 ring-1 ring-red-200',
                step.status === 'awaiting_manual_edit' && 'bg-amber-50 ring-1 ring-amber-200',
                !isCurrent && step.status !== 'failed' && step.status !== 'awaiting_manual_edit' && 'bg-muted/30',
              )}
            >
              {/* Status icon */}
              <span className="mt-0.5 flex-shrink-0">{STATUS_ICON[step.status]}</span>

              {/* Step details */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('font-medium', step.status === 'pending' && 'text-muted-foreground')}>
                    {step.name}
                  </span>
                  {step.script && (
                    <span className="font-mono text-xs text-muted-foreground">{step.script}</span>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn('text-xs px-1.5 py-0', STATUS_BADGE_CLASS[step.status])}
                  >
                    {STATUS_LABEL[step.status]}
                  </Badge>
                  {duration && (
                    <span className="text-xs text-muted-foreground">{duration}</span>
                  )}
                </div>

                {/* Error message inline */}
                {step.status === 'failed' && step.error && (
                  <p className="mt-1 text-xs text-red-600 font-mono break-all">
                    {step.error}
                  </p>
                )}

                {/* Awaiting manual edit indicator */}
                {step.status === 'awaiting_manual_edit' && (
                  <p className="mt-1 text-xs text-amber-700">
                    Waiting for manual edit confirmation before pipeline resumes.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
