import { Link } from "react-router-dom";
import { Clock, Camera, Video, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface RetainerCardProps {
  code: string;
  name: string;
  price: number;
  price_per_visit?: number;
  visits_per_month: number;
  turnaround: string;
  deliverables: {
    photos: number;
    videos: number;
    raw_included: boolean;
  };
  featured?: boolean;
}

export function RetainerCard({
  code,
  name,
  price,
  price_per_visit,
  visits_per_month,
  turnaround,
  deliverables,
  featured = false
}: RetainerCardProps) {
  const savings = price_per_visit ? (450 - price_per_visit) * visits_per_month : 0;

  return (
    <div className={cn(
      "bg-card rounded-xl border p-5 flex flex-col",
      featured ? "border-accent ring-2 ring-accent/20" : "border-border"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-bold text-primary">{name}</h4>
          <p className="text-sm text-muted-foreground">
            {visits_per_month} visit{visits_per_month > 1 ? 's' : ''}/month
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-primary">${price.toLocaleString()}</span>
          <span className="text-muted-foreground text-sm">/mo</span>
          {savings > 0 && (
            <p className="text-xs text-accent font-medium">Save ${savings}/mo</p>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-accent" />
          <span>{deliverables.photos} photos/visit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Video className="w-4 h-4 text-accent" />
          <span>{deliverables.videos} clips/visit</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Clock className="w-4 h-4" />
        <span>{turnaround}</span>
      </div>

      <Link
        to={`/request-service?service=AERIAL&package=${code}`}
        className="mt-auto block w-full text-center py-2.5 px-4 rounded-full font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all text-sm"
      >
        Select Retainer
      </Link>
    </div>
  );
}
