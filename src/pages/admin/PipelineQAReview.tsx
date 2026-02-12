import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send } from 'lucide-react';
import AdminNav from './components/AdminNav';
import QAReviewGrid from '@/components/pipeline/QAReviewGrid';
import { useQAOverride, useResumePipeline } from '@/hooks/usePipeline';
import type { DroneAsset } from '@/types/drone';

export default function PipelineQAReview() {
  const { missionId } = useParams<{ missionId: string }>();
  const { toast } = useToast();
  const qaOverride = useQAOverride();
  const resumePipeline = useResumePipeline();
  const [submitting, setSubmitting] = useState(false);

  const { data: assets = [], refetch } = useQuery({
    queryKey: ['qa-review-assets', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_assets')
        .select('*')
        .eq('job_id', missionId!)
        .in('qa_status', ['failed', 'warning'])
        .order('sort_order');

      if (error) throw error;
      return data as DroneAsset[];
    },
    enabled: !!missionId,
  });

  const { data: job } = useQuery({
    queryKey: ['qa-review-job', missionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drone_jobs')
        .select('job_number, property_address')
        .eq('id', missionId!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!missionId,
  });

  const handleAction = async (
    assetId: string,
    action: 'approve' | 'exclude' | 'reshoot',
  ) => {
    try {
      await qaOverride.mutateAsync({ assetId, action });
      toast({ title: `Asset ${action}d` });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Action failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleBatchApproveWarnings = async () => {
    const warnings = assets.filter((a) => a.qa_status === 'warning');
    for (const asset of warnings) {
      await qaOverride.mutateAsync({ assetId: asset.id, action: 'approve' });
    }
    toast({ title: `Approved ${warnings.length} warning assets` });
    refetch();
  };

  const handleBatchExcludeFailed = async () => {
    const failed = assets.filter((a) => a.qa_status === 'failed');
    for (const asset of failed) {
      await qaOverride.mutateAsync({ assetId: asset.id, action: 'exclude' });
    }
    toast({ title: `Excluded ${failed.length} failed assets` });
    refetch();
  };

  const handleSubmitReview = async () => {
    if (!missionId) return;
    setSubmitting(true);
    try {
      await resumePipeline.mutateAsync({
        missionId,
        holdType: 'qa_review',
      });
      toast({ title: 'Pipeline resumed', description: 'QA review submitted' });
    } catch (err: any) {
      toast({
        title: 'Resume failed',
        description: err.message,
        variant: 'destructive',
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin/pipeline">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                QA Review {job?.job_number && `— ${job.job_number}`}
              </h1>
              {job?.property_address && (
                <p className="text-sm text-muted-foreground">
                  {job.property_address}
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={handleSubmitReview}
            disabled={submitting}
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit Review & Resume'}
          </Button>
        </div>

        <QAReviewGrid
          assets={assets}
          onAction={handleAction}
          onBatchApproveWarnings={handleBatchApproveWarnings}
          onBatchExcludeFailed={handleBatchExcludeFailed}
          isActioning={qaOverride.isPending}
        />
      </main>
    </div>
  );
}
