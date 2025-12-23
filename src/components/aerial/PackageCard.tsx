import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Check, Camera, Video, FileImage, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PackageCardProps {
  code: string;
  name: string;
  price: number;
  turnaround: string;
  deliverables: {
    photos: number;
    videos: number;
    raw_included: boolean;
  };
  delivery_formats: string[];
  shot_manifest: Array<{ name: string; count: number; required?: boolean; type?: string }>;
  video_clips?: Array<{ name: string; required?: boolean; duration?: string }>;
  video_structure?: string[];
  video_duration?: string;
  featured?: boolean;
  category: 'real_estate' | 'construction';
}

export function PackageCard({
  code,
  name,
  price,
  turnaround,
  deliverables,
  delivery_formats,
  shot_manifest,
  video_clips,
  video_structure,
  video_duration,
  featured = false,
  category
}: PackageCardProps) {
  const photoShots = shot_manifest.filter(s => s.type !== 'ground');
  const groundShots = shot_manifest.filter(s => s.type === 'ground');
  const totalPhotos = shot_manifest.reduce((acc, s) => acc + (s.count || 1), 0);

  return (
    <div className={cn(
      "relative bg-card rounded-2xl border shadow-lg overflow-hidden flex flex-col",
      featured ? "border-accent ring-2 ring-accent/20" : "border-border"
    )}>
      {featured && (
        <div className="absolute top-0 left-0 right-0 bg-accent text-accent-foreground text-center py-1.5 text-sm font-semibold">
          Most Popular
        </div>
      )}
      
      <div className={cn("p-6 flex-1 flex flex-col", featured && "pt-10")}>
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-primary font-display mb-2">{name}</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-primary">${price.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span>{turnaround}</span>
          </div>
        </div>

        {/* Deliverables summary */}
        <div className="flex justify-center gap-4 mb-6 pb-6 border-b border-border">
          <div className="flex items-center gap-1.5 text-sm">
            <Camera className="w-4 h-4 text-accent" />
            <span className="font-semibold text-primary">{deliverables.photos}</span>
            <span className="text-muted-foreground">photos</span>
          </div>
          {deliverables.videos > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Video className="w-4 h-4 text-accent" />
              <span className="font-semibold text-primary">{deliverables.videos}</span>
              <span className="text-muted-foreground">video</span>
            </div>
          )}
          {deliverables.raw_included && (
            <div className="flex items-center gap-1.5 text-sm">
              <FileImage className="w-4 h-4 text-accent" />
              <span className="text-muted-foreground">Raw included</span>
            </div>
          )}
        </div>

        {/* Delivery formats */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {delivery_formats.map((format) => (
            <Badge key={format} variant="secondary" className="text-xs">
              {format}
            </Badge>
          ))}
        </div>

        {/* Shot manifest */}
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary mb-3">Shot Set Included:</p>
          <ul className="space-y-2">
            {photoShots.slice(0, 6).map((shot, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span className="text-card-foreground">
                  {shot.name} <span className="text-muted-foreground">({shot.count})</span>
                </span>
              </li>
            ))}
            {photoShots.length > 6 && (
              <li className="text-sm text-muted-foreground pl-6">
                + {photoShots.length - 6} more shot types
              </li>
            )}
          </ul>

          {groundShots.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Ground-Level:</p>
              <ul className="space-y-1.5">
                {groundShots.slice(0, 3).map((shot, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-card-foreground">
                      {shot.name} <span className="text-muted-foreground">({shot.count})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {video_clips && video_clips.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Video Clips:</p>
              <ul className="space-y-1.5">
                {video_clips.slice(0, 4).map((clip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Video className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <span className="text-card-foreground">{clip.name}</span>
                  </li>
                ))}
              </ul>
              {video_duration && (
                <p className="text-xs text-muted-foreground mt-2 pl-5">
                  Final edit: {video_duration}
                </p>
              )}
            </div>
          )}

          {video_structure && video_structure.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Video Structure:</p>
              <ul className="space-y-1.5">
                {video_structure.map((section, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Video className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <span className="text-card-foreground">{section}</span>
                  </li>
                ))}
              </ul>
              {video_duration && (
                <p className="text-xs text-muted-foreground mt-2 pl-5">
                  Final edit: {video_duration}
                </p>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <Link
          to={`/request-service?service=AERIAL&package=${code}`}
          className={cn(
            "mt-6 block w-full text-center py-3 px-4 rounded-full font-semibold transition-all duration-200",
            featured
              ? "bg-accent text-accent-foreground hover:opacity-90"
              : "bg-primary text-primary-foreground hover:opacity-90"
          )}
        >
          Select This Package
        </Link>
      </div>
    </div>
  );
}
