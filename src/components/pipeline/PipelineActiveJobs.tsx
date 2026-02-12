import { useState } from 'react';
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
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
import PipelineStepRow from './PipelineStepRow';
import type { ProcessingStep } from '@/types/pipeline';

interface PipelineJob {
  id: string;
  job_number: string;
  property_address: string;
  status: string;
  customers: { name: string; email: string } | null;
  drone_packages: { name: string; code: string } | null;
  processing_steps: ProcessingStep[];
}

interface PipelineActiveJobsProps {
  jobs: PipelineJob[];
}

export default function PipelineActiveJobs({ jobs }: PipelineActiveJobsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No active pipeline jobs
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Job #</TableHead>
          <TableHead>Property</TableHead>
          <TableHead className="hidden md:table-cell">Customer</TableHead>
          <TableHead className="hidden lg:table-cell">Package</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => {
          const isExpanded = expandedIds.has(job.id);
          const steps = (job.processing_steps || []).sort(
            (a, b) => a.step_order - b.step_order,
          );

          return (
            <>
              <TableRow key={job.id} className="cursor-pointer" onClick={() => toggleExpand(job.id)}>
                <TableCell>
                  {steps.length > 0 &&
                    (isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ))}
                </TableCell>
                <TableCell className="font-mono text-sm font-medium">
                  {job.job_number}
                </TableCell>
                <TableCell>{job.property_address}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {job.customers?.name || '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {job.drone_packages?.name || '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={
                      job.status === 'processing'
                        ? 'bg-amber-100 text-amber-700'
                        : job.status === 'complete'
                          ? 'bg-teal-100 text-teal-700'
                          : job.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : ''
                    }
                  >
                    {job.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    to={`/admin/drone-jobs/${job.id}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
              {isExpanded && steps.length > 0 && (
                <TableRow key={`${job.id}-steps`}>
                  <TableCell colSpan={7} className="bg-muted/30 py-3 px-6">
                    <PipelineStepRow steps={steps} />
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </TableBody>
    </Table>
  );
}
