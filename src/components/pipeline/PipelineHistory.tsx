import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye } from 'lucide-react';
import { format } from 'date-fns';
import type { ProcessingStep } from '@/types/pipeline';

interface HistoryJob {
  id: string;
  job_number: string;
  property_address: string;
  status: string;
  customers: { name: string; email: string } | null;
  drone_packages: { name: string; code: string } | null;
  processing_steps: ProcessingStep[];
}

interface PipelineHistoryProps {
  jobs: HistoryJob[];
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job #</TableHead>
          <TableHead>Property</TableHead>
          <TableHead className="hidden md:table-cell">Customer</TableHead>
          <TableHead>Result</TableHead>
          <TableHead className="hidden lg:table-cell">Steps</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const steps = (job.processing_steps || []).sort(
            (a, b) => a.step_order - b.step_order,
          );
          const lastStep = steps[steps.length - 1];
          const completedAt = lastStep?.completed_at
            ? format(new Date(lastStep.completed_at), 'MMM d, h:mm a')
            : '—';

          return (
            <TableRow key={job.id}>
              <TableCell className="font-mono text-sm font-medium">
                {job.job_number}
              </TableCell>
              <TableCell>{job.property_address}</TableCell>
              <TableCell className="hidden md:table-cell">
                {job.customers?.name || '—'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={
                    job.status === 'delivered'
                      ? 'bg-green-100 text-green-700'
                      : job.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : ''
                  }
                >
                  {job.status}
                </Badge>
                <span className="ml-2 text-xs text-muted-foreground">
                  {completedAt}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                {steps.filter((s) => s.status === 'complete').length}/{steps.length} steps
              </TableCell>
              <TableCell className="text-right">
                <Link to={`/admin/drone-jobs/${job.id}`}>
                  <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
