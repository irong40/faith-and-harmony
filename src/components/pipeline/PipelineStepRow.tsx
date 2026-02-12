import { CircleDashed, Loader2, CheckCircle, XCircle, SkipForward } from 'lucide-react';
import type { ProcessingStep, ProcessingStepStatus } from '@/types/pipeline';
import { STEP_STATUS_CONFIG, STEP_LABEL_MAP, type PipelineStepName } from '@/types/pipeline';

const STATUS_ICONS: Record<ProcessingStepStatus, React.ReactNode> = {
  waiting: <CircleDashed className="h-5 w-5 text-slate-400" />,
  running: <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />,
  complete: <CheckCircle className="h-5 w-5 text-green-600" />,
  failed: <XCircle className="h-5 w-5 text-red-600" />,
  skipped: <SkipForward className="h-5 w-5 text-gray-400" />,
};

interface PipelineStepRowProps {
  steps: ProcessingStep[];
}

export default function PipelineStepRow({ steps }: PipelineStepRowProps) {
  if (steps.length === 0) return null;

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {steps.map((step, i) => {
        const config = STEP_STATUS_CONFIG[step.status];
        const label =
          STEP_LABEL_MAP[step.step_name as PipelineStepName] || step.step_name;

        return (
          <div key={step.id} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-6 h-0.5 ${
                  step.status === 'waiting' ? 'bg-slate-200' : 'bg-slate-300'
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}
              title={step.error_message || undefined}
            >
              {STATUS_ICONS[step.status]}
              <span className="hidden sm:inline whitespace-nowrap">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
