import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Mail, Star } from "lucide-react";

interface Lead {
  id: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  portfolio_type: string | null;
  google_rating: number | null;
  review_count: number | null;
  hunter_io_score: number | null;
  priority: string | null;
}

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
  onClick: () => void;
}

const priorityColors: Record<string, string> = {
  high: 'border-l-4 border-l-destructive',
  medium: 'border-l-4 border-l-amber-500',
  low: 'border-l-4 border-l-muted-foreground/30',
};

export default function LeadCard({ lead, isDragging, onClick }: LeadCardProps) {
  const priorityClass = priorityColors[lead.priority || 'medium'] || priorityColors.medium;

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${priorityClass} ${
        isDragging ? 'shadow-lg rotate-2' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm line-clamp-2" title={lead.company_name}>
            {lead.company_name}
          </h4>
          {lead.priority === 'high' && (
            <Badge variant="destructive" className="shrink-0 text-xs">
              High
            </Badge>
          )}
        </div>
        
        {lead.portfolio_type && (
          <Badge variant="outline" className="mb-2 text-xs">
            {lead.portfolio_type}
          </Badge>
        )}
        
        <div className="space-y-1 text-xs text-muted-foreground">
          {lead.city && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>{lead.city}, {lead.state}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-green-500" />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
          {lead.google_rating && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500" />
              <span>{lead.google_rating} ({lead.review_count} reviews)</span>
            </div>
          )}
        </div>
        
        {lead.hunter_io_score && (
          <div className="mt-2 flex items-center gap-1">
            <div className="text-xs text-muted-foreground">Hunter:</div>
            <Badge 
              variant={lead.hunter_io_score >= 80 ? "default" : "secondary"}
              className="text-xs"
            >
              {lead.hunter_io_score}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
