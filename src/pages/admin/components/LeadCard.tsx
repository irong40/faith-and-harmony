import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MapPin, Mail, Star, Copy, Send, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type LeadStatus = 'new' | 'contacted' | 'responded' | 'qualified' | 'client';

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
  status: LeadStatus;
}

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
  onClick: () => void;
  onStatusChange?: (id: string, status: LeadStatus) => void;
  onQuickAction?: (action: 'copy' | 'email' | 'contacted', lead: Lead) => void;
}

const priorityColors: Record<string, string> = {
  high: 'border-l-4 border-l-destructive',
  medium: 'border-l-4 border-l-amber-500',
  low: 'border-l-4 border-l-muted-foreground/30',
};

const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'responded', label: 'Responded' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'client', label: 'Client' },
];

export default function LeadCard({ lead, isDragging, onClick, onStatusChange, onQuickAction }: LeadCardProps) {
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const priorityClass = priorityColors[lead.priority || 'medium'] || priorityColors.medium;

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.email) {
      navigator.clipboard.writeText(lead.email);
      toast({ title: "Email copied", description: lead.email });
      onQuickAction?.('copy', lead);
    }
  };

  const handleSendEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.email) {
      window.open(`mailto:${lead.email}?subject=Aerial Photography Services`, '_blank');
      onQuickAction?.('email', lead);
    }
  };

  const handleMarkContacted = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.status === 'new') {
      onStatusChange?.(lead.id, 'contacted');
      onQuickAction?.('contacted', lead);
    }
  };

  const handleStatusSelect = (value: LeadStatus) => {
    onStatusChange?.(lead.id, value);
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all ${priorityClass} ${
        isDragging ? 'shadow-lg rotate-2' : ''
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

        {/* Quick Actions - visible on hover */}
        {isHovered && !isDragging && (
          <div className="mt-3 pt-2 border-t flex items-center justify-between gap-1">
            <TooltipProvider delayDuration={0}>
              <div className="flex gap-1">
                {lead.email && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={handleCopyEmail}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy email</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={handleSendEmail}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Send email</TooltipContent>
                    </Tooltip>
                  </>
                )}
                {lead.status === 'new' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleMarkContacted}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Mark contacted</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>

            {/* Keyboard-accessible status dropdown */}
            <Select
              value={lead.status}
              onValueChange={handleStatusSelect}
            >
              <SelectTrigger 
                className="h-7 w-[90px] text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
