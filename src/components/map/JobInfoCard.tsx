import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-500' },
  captured: { label: 'In Progress', color: 'bg-orange-500' },
  complete: { label: 'Complete', color: 'bg-green-500' },
  canceled: { label: 'Canceled', color: 'bg-gray-500' },
};

interface JobInfoCardProps {
  id: string;
  clientName: string;
  address: string;
  status: string;
  scheduledDate: string | null;
  onClose?: () => void;
}

export default function JobInfoCard({
  id,
  clientName,
  address,
  status,
  scheduledDate,
  onClose,
}: JobInfoCardProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.scheduled;

  return (
    <Card className="absolute bottom-4 left-4 right-4 z-10 shadow-lg max-w-sm mx-auto">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm truncate">{clientName}</h3>
          <Badge className={`${config.color} text-white text-xs`}>{config.label}</Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{address}</span>
        </div>
        {scheduledDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{format(new Date(scheduledDate), 'MMM d, yyyy')}</span>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Link to={`/pilot/mission/${id}`} className="flex-1">
            <Button size="sm" className="w-full text-xs">
              View Mission <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
              Close
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
