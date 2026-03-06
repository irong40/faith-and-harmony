import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import AdminNav from './components/AdminNav';
import CoverageChecklist from '@/components/pipeline/CoverageChecklist';
import CoverageActions from '@/components/pipeline/CoverageActions';
import { useProcessingTemplate, useProcessingTemplateById, useResumePipeline } from '@/hooks/usePipeline';
import type { DroneAsset } from '@/types/drone';

export default function PipelineCoverageReview() {
  const { missionId } = useParams<{ missionId: string }>();
  const { toast } = useToast();
  const resumePipeline = useResumePipeline();

  const { data: job } = useQuery({
    queryKey: ['coverage-review-job', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_jobs')
        .select('job_number, property_address, processing_template_id, drone_packages(id, name)')
        .eq('id', missionId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  // Prefer direct template assignment (covers standalone paths C, D, V, B+C)
  // Fall back to package-based lookup for legacy jobs
  const templateId = job?.processing_template_id as string | null;
  const dronePackages = job?.drone_packages as { id: string; name: string } | null;
  const packageId = dronePackages?.id;
  const { data: templateById } = useProcessingTemplateById(templateId ?? undefined);
  const { data: templateByPkg } = useProcessingTemplate(!templateId ? packageId : undefined);
  const template = templateById ?? templateByPkg;

  const { data: assets = [] } = useQuery({
    queryKey: ['coverage-review-assets', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_assets')
        .select('*')
        .eq('job_id', missionId!)
        .eq('pipeline_excluded', false)
        .order('sort_order');

      if (error) throw error;
      return data as DroneAsset[];
    },
    enabled: !!missionId,
  });

  const shotRequirements = template?.shot_requirements || [];
  const requirements = Array.isArray(shotRequirements)
    ? (shotRequirements as { tag: string; label: string; required: boolean }[])
    : [];
  const coverageTags = new Set(
    assets.filter((a) => a.coverage_tag).map((a) => a.coverage_tag!),
  );
  const hasMissing = requirements.some(
    (r) => r.required && !coverageTags.has(r.tag),
  );

  const handleOverride = async () => {
    if (!missionId) return;
    try {
      await resumePipeline.mutateAsync({
        missionId,
        holdType: 'coverage_review',
      });
      toast({ title: 'Pipeline resumed', description: 'Coverage override applied' });
    } catch (err: any) {
      toast({
        title: 'Resume failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleRetrigger = async () => {
    if (!missionId) return;
    try {
      await resumePipeline.mutateAsync({
        missionId,
        holdType: 'coverage_review',
      });
      toast({
        title: 'Coverage re-triggered',
        description: 'Pipeline will re-validate coverage',
      });
    } catch (err: any) {
      toast({
        title: 'Re-trigger failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // GPS coordinate table for assets (lightweight alternative to a map)
  const gpsAssets = assets.filter(
    (a) => a.gps_latitude != null && a.gps_longitude != null,
  );

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/admin/pipeline">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Coverage Review {job?.job_number && `— ${job.job_number}`}
            </h1>
            {job?.property_address && (
              <p className="text-sm text-muted-foreground">
                {job.property_address}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <CoverageChecklist
              shotRequirements={template?.shot_requirements || '[]'}
              assets={assets}
            />

            {/* GPS Coordinate Table */}
            {gpsAssets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    GPS Coordinates ({gpsAssets.length} assets)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Lat</TableHead>
                        <TableHead>Lon</TableHead>
                        <TableHead>Bearing</TableHead>
                        <TableHead>Tag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gpsAssets.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono text-xs truncate max-w-[150px]">
                            {a.file_name}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.gps_latitude?.toFixed(6)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.gps_longitude?.toFixed(6)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.compass_bearing != null
                              ? `${a.compass_bearing}°`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {a.coverage_tag || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <CoverageActions
              onOverride={handleOverride}
              onRetrigger={handleRetrigger}
              isLoading={resumePipeline.isPending}
              hasMissingShots={hasMissing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
