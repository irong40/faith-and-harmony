import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import type { DroneAsset } from '@/types/drone';
import type { Json } from '@/integrations/supabase/types';

interface ShotRequirement {
  tag: string;
  label: string;
  required: boolean;
}

interface CoverageChecklistProps {
  shotRequirements: Json;
  assets: DroneAsset[];
}

export default function CoverageChecklist({
  shotRequirements,
  assets,
}: CoverageChecklistProps) {
  const requirements = (
    Array.isArray(shotRequirements) ? shotRequirements : []
  ) as ShotRequirement[];

  if (requirements.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No shot requirements configured for this package
        </CardContent>
      </Card>
    );
  }

  const coverageTags = new Set(
    assets
      .filter((a) => a.coverage_tag && !a.pipeline_excluded)
      .map((a) => a.coverage_tag!),
  );

  const matched = requirements.filter((r) => coverageTags.has(r.tag));
  const missing = requirements.filter(
    (r) => r.required && !coverageTags.has(r.tag),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Shot Requirements ({matched.length}/{requirements.length} matched)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {requirements.map((req) => {
            const isMatched = coverageTags.has(req.tag);
            const matchingAssets = assets.filter(
              (a) => a.coverage_tag === req.tag && !a.pipeline_excluded,
            );

            return (
              <li key={req.tag} className="flex items-center gap-3 py-1">
                {isMatched ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle
                    className={`h-5 w-5 flex-shrink-0 ${
                      req.required ? 'text-red-600' : 'text-gray-400'
                    }`}
                  />
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium">{req.label}</span>
                  {!req.required && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (optional)
                    </span>
                  )}
                </div>
                {isMatched && (
                  <span className="text-xs text-muted-foreground">
                    {matchingAssets.length} photo{matchingAssets.length !== 1 ? 's' : ''}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {missing.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-700">
              {missing.length} required shot{missing.length !== 1 ? 's' : ''} missing
            </p>
            <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
              {missing.map((m) => (
                <li key={m.tag}>{m.label}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
