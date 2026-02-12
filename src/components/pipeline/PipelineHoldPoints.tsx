import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Camera, MapPin } from 'lucide-react';

interface HoldPointStep {
  id: string;
  step_name: string;
  error_message: string | null;
  created_at: string;
  drone_jobs: {
    id: string;
    job_number: string;
    property_address: string;
    status: string;
    customers: { name: string } | null;
  } | null;
}

interface PipelineHoldPointsProps {
  holdPoints: HoldPointStep[];
}

export default function PipelineHoldPoints({ holdPoints }: PipelineHoldPointsProps) {
  if (holdPoints.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No jobs on hold
      </div>
    );
  }

  const qaHolds = holdPoints.filter((h) => h.step_name === 'qa_gate');
  const coverageHolds = holdPoints.filter((h) => h.step_name === 'coverage_check');

  return (
    <div className="space-y-6">
      {qaHolds.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            QA Review Required ({qaHolds.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {qaHolds.map((hold) => (
              <Card key={hold.id} className="border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    {hold.drone_jobs?.job_number}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">{hold.drone_jobs?.property_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {hold.drone_jobs?.customers?.name || 'No customer'}
                  </p>
                  {hold.error_message && (
                    <Badge variant="outline" className="text-xs">
                      {hold.error_message}
                    </Badge>
                  )}
                  <Link to={`/admin/pipeline/qa/${hold.drone_jobs?.id}`}>
                    <Button size="sm" className="w-full mt-2">
                      <Camera className="mr-2 h-4 w-4" />
                      Review QA
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {coverageHolds.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Coverage Review Required ({coverageHolds.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {coverageHolds.map((hold) => (
              <Card key={hold.id} className="border-amber-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4 text-amber-500" />
                    {hold.drone_jobs?.job_number}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">{hold.drone_jobs?.property_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {hold.drone_jobs?.customers?.name || 'No customer'}
                  </p>
                  {hold.error_message && (
                    <Badge variant="outline" className="text-xs">
                      {hold.error_message}
                    </Badge>
                  )}
                  <Link to={`/admin/pipeline/coverage/${hold.drone_jobs?.id}`}>
                    <Button size="sm" variant="outline" className="w-full mt-2">
                      <MapPin className="mr-2 h-4 w-4" />
                      Review Coverage
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
