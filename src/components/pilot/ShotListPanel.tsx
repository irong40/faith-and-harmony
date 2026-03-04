import { useState } from 'react';
import { Camera, Video, Thermometer, ChevronDown, ChevronRight, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Shot {
  name: string;
  type: 'photo' | 'video' | 'thermal';
}

interface ShotGroup {
  group: string;
  shots: Shot[];
}

interface ShotListPanelProps {
  shotManifest: ShotGroup[] | null;
  packageName?: string | null;
}

const SHOT_ICON = {
  photo: Camera,
  video: Video,
  thermal: Thermometer,
} as const;

const SHOT_ICON_COLOR = {
  photo: 'text-blue-500',
  video: 'text-purple-500',
  thermal: 'text-orange-500',
} as const;

export default function ShotListPanel({ shotManifest, packageName }: ShotListPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!shotManifest || shotManifest.length === 0) return null;

  const totalShots = shotManifest.reduce((sum, g) => sum + g.shots.length, 0);

  return (
    <Card>
      <CardHeader
        className="pb-3 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Shot List</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {totalShots} shots
            </Badge>
          </div>
          {isOpen
            ? <ChevronDown className="h-5 w-5 text-muted-foreground" />
            : <ChevronRight className="h-5 w-5 text-muted-foreground" />
          }
        </div>
        {packageName && (
          <p className="text-xs text-muted-foreground mt-1">{packageName}</p>
        )}
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4 pt-0">
          {shotManifest.map((group) => (
            <div key={group.group}>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {group.group}
              </h4>
              <div className="space-y-1">
                {group.shots.map((shot) => {
                  const Icon = SHOT_ICON[shot.type] || Camera;
                  const iconColor = SHOT_ICON_COLOR[shot.type] || 'text-muted-foreground';
                  return (
                    <div
                      key={shot.name}
                      className="flex items-center gap-2 py-1 px-2 rounded text-sm"
                    >
                      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${iconColor}`} />
                      <span>{shot.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
