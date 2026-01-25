import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertTriangle, XCircle, Clock, ThumbsUp, ThumbsDown, MapPin, Camera, Calendar } from "lucide-react";
import type { DroneAsset, QAResults } from "@/types/drone";

interface QADetailModalProps {
  asset: DroneAsset | null;
  onClose: () => void;
  onRefresh: () => void;
}

const SEVERITY_CONFIG: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-500", label: "Critical" },
  major: { color: "bg-orange-500", label: "Major" },
  minor: { color: "bg-amber-500", label: "Minor" },
  suggestion: { color: "bg-blue-500", label: "Suggestion" },
};

const ACTION_CONFIG: Record<string, { label: string; icon: typeof CheckCircle }> = {
  fix_in_post: { label: "Fix in Post", icon: Clock },
  reshoot: { label: "Reshoot", icon: XCircle },
  accept_as_is: { label: "Accept", icon: CheckCircle },
  flag_for_review: { label: "Review", icon: AlertTriangle },
};

export default function QADetailModal({ asset, onClose, onRefresh }: QADetailModalProps) {
  const { toast } = useToast();
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!asset) return null;

  const qaResults = asset.qa_results as unknown as QAResults | null;

  const handleOverride = async (approve: boolean) => {
    if (!overrideReason.trim()) {
      toast({ title: "Please provide a reason for the override", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("drone_assets")
      .update({
        qa_status: approve ? "approved" : "rejected",
        qa_override: true,
        qa_override_reason: overrideReason,
        qa_override_by: "admin", // In production, use actual user ID
      })
      .eq("id", asset.id);

    if (error) {
      toast({ title: "Override failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Asset ${approve ? "approved" : "rejected"}` });
      onRefresh();
      onClose();
    }
    setSaving(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const formatVideoDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={!!asset} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            QA Details: {asset.file_name}
            {asset.qa_score !== null && (
              <Badge variant="outline" className={`font-mono ${getScoreColor(asset.qa_score)}`}>
                Score: {asset.qa_score}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Media Preview */}
          <div>
            {asset.file_type?.startsWith("video") ? (
              <div className="space-y-2">
                <video
                  src={asset.file_path}
                  controls
                  className="w-full rounded-lg border border-border"
                  preload="metadata"
                >
                  Your browser does not support the video tag.
                </video>

                {/* Video Metadata */}
                {(asset.video_duration_seconds || asset.video_resolution || asset.video_fps) && (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <Label className="text-muted-foreground text-xs">Video Metadata</Label>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {asset.video_duration_seconds && (
                        <div>
                          <span className="text-muted-foreground">Duration:</span>{" "}
                          <span className="font-medium">
                            {formatVideoDuration(asset.video_duration_seconds)}
                          </span>
                        </div>
                      )}
                      {asset.video_resolution && (
                        <div>
                          <span className="text-muted-foreground">Resolution:</span>{" "}
                          <span className="font-medium">{asset.video_resolution}</span>
                        </div>
                      )}
                      {asset.video_fps && (
                        <div>
                          <span className="text-muted-foreground">FPS:</span>{" "}
                          <span className="font-medium">{asset.video_fps.toFixed(2)}</span>
                        </div>
                      )}
                      {asset.video_codec && (
                        <div>
                          <span className="text-muted-foreground">Codec:</span>{" "}
                          <span className="font-medium">{asset.video_codec}</span>
                        </div>
                      )}
                      {asset.video_bitrate && (
                        <div>
                          <span className="text-muted-foreground">Bitrate:</span>{" "}
                          <span className="font-medium">
                            {(asset.video_bitrate / 1000).toFixed(1)} Mbps
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : asset.file_type?.startsWith("image") ? (
              <img
                src={asset.file_path}
                alt={asset.file_name}
                className="w-full rounded-lg border border-border"
              />
            ) : (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                {asset.file_name}
              </div>
            )}

            {/* Shot Classification */}
            {qaResults?.shot_classification && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <Label className="text-muted-foreground text-xs">Shot Classification</Label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-medium capitalize">
                    {qaResults.shot_classification.type.replace(/_/g, " ")}
                  </span>
                  <Badge variant={qaResults.shot_classification.matches_expected ? "default" : "secondary"}>
                    {Math.round(qaResults.shot_classification.confidence * 100)}% confidence
                  </Badge>
                </div>
              </div>
            )}

            {/* EXIF Data */}
            {(asset.camera_model || asset.capture_date || asset.gps_latitude) && (
              <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-2">
                <Label className="text-muted-foreground text-xs">EXIF Data</Label>
                {asset.camera_model && (
                  <div className="flex items-center gap-2 text-sm">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span>{asset.camera_model}</span>
                  </div>
                )}
                {asset.capture_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(asset.capture_date).toLocaleString()}</span>
                  </div>
                )}
                {asset.gps_latitude && asset.gps_longitude && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`https://www.google.com/maps?q=${asset.gps_latitude},${asset.gps_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {asset.gps_latitude.toFixed(6)}, {asset.gps_longitude.toFixed(6)}
                      {asset.gps_altitude && ` (${Math.round(asset.gps_altitude)}m alt)`}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* QA Analysis */}
          <div className="space-y-4">
            {qaResults ? (
              <>
                {/* Summary */}
                {qaResults.summary && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Summary</Label>
                    <p className="text-sm mt-1">{qaResults.summary}</p>
                  </div>
                )}

                {/* Analysis Scores */}
                {qaResults.analysis && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Analysis Breakdown</Label>
                    <div className="space-y-2 mt-2">
                      {Object.entries(qaResults.analysis).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="capitalize text-muted-foreground">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className={`font-medium ${getScoreColor(value.score)}`}>
                            {value.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlights */}
                {qaResults.highlights && qaResults.highlights.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Highlights</Label>
                    <ul className="mt-1 space-y-1">
                      {qaResults.highlights.map((h, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                {/* Issues */}
                {qaResults.issues && qaResults.issues.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Issues Found</Label>
                    <div className="space-y-3 mt-2">
                      {qaResults.issues.map((issue, i) => {
                        const sevConfig = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.minor;
                        const actConfig = ACTION_CONFIG[issue.recommended_action] || ACTION_CONFIG.flag_for_review;
                        const ActIcon = actConfig.icon;

                        return (
                          <div key={i} className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <Badge className={`${sevConfig.color} text-white text-xs`}>
                                {sevConfig.label}
                              </Badge>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ActIcon className="h-3 w-3" />
                                {actConfig.label}
                                {issue.estimated_fix_time_minutes > 0 && (
                                  <span className="ml-1">({issue.estimated_fix_time_minutes}m)</span>
                                )}
                              </div>
                            </div>
                            <p className="text-sm font-medium">{issue.category}</p>
                            <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {qaResults.issues?.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                    <p className="text-sm">No issues found</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 mb-2" />
                <p>No QA analysis available</p>
                <Button
                  className="mt-4"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      const { error } = await supabase.functions.invoke('drone-qa-analyze', {
                        body: { asset_id: asset.id }
                      });
                      if (error) throw error;
                      toast({ title: "Analysis started", description: "QA analysis is running..." });
                      setTimeout(() => {
                        onRefresh();
                      }, 3000);
                    } catch (err) {
                      toast({ title: "Analysis failed", description: String(err), variant: "destructive" });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? "Analyzing..." : "Run QA Analysis"}
                </Button>
              </div>
            )}

            <Separator />

            {/* Admin Override */}
            <div>
              <Label className="text-muted-foreground text-xs">Admin Override</Label>
              <Textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for override (required)"
                rows={2}
                className="mt-2"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOverride(true)}
                  disabled={saving}
                  className="flex-1"
                >
                  <ThumbsUp className="mr-1 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOverride(false)}
                  disabled={saving}
                  className="flex-1"
                >
                  <ThumbsDown className="mr-1 h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog >
  );
}
