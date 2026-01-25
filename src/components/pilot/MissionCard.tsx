import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Cloud, CloudOff, CloudUpload, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

type MissionStatus = "scheduled" | "in_progress" | "complete" | "canceled";
type SyncStatus = "synced" | "pending" | "conflict" | "offline";

interface MissionCardProps {
    mission: {
        id: string;
        client_name: string;
        address: string;
        scheduled_date: string | null;
        status: MissionStatus;
        package_type?: string;
    };
    syncStatus?: SyncStatus;
}

const STATUS_CONFIG: Record<MissionStatus, { label: string; color: string }> = {
    scheduled: { label: "SCHEDULED", color: "bg-blue-500" },
    in_progress: { label: "IN PROGRESS", color: "bg-orange-500" },
    complete: { label: "COMPLETE", color: "bg-green-500" },
    canceled: { label: "CANCELED", color: "bg-gray-500" },
};

const SYNC_ICONS: Record<SyncStatus, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    synced: { icon: Cloud, color: "text-green-500" },
    pending: { icon: CloudUpload, color: "text-yellow-500" },
    conflict: { icon: AlertTriangle, color: "text-red-500" },
    offline: { icon: CloudOff, color: "text-muted-foreground" },
};

export default function MissionCard({ mission, syncStatus = "synced" }: MissionCardProps) {
    const statusConfig = STATUS_CONFIG[mission.status];
    const syncConfig = SYNC_ICONS[syncStatus];
    const SyncIcon = syncConfig.icon;

    // Truncate address to ~40 chars
    const truncatedAddress = mission.address.length > 40
        ? mission.address.substring(0, 37) + "..."
        : mission.address;

    return (
        <Link to={`/pilot/mission/${mission.id}`}>
            <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        {/* Main Content */}
                        <div className="flex-1 min-w-0">
                            {/* Client Name */}
                            <h4 className="font-semibold text-foreground truncate">
                                {mission.client_name}
                            </h4>

                            {/* Address */}
                            <div className="flex items-center gap-1.5 mt-1">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm text-muted-foreground truncate">
                                    {truncatedAddress}
                                </span>
                            </div>

                            {/* Date & Package */}
                            <div className="flex items-center gap-3 mt-2">
                                {mission.scheduled_date && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            {format(new Date(mission.scheduled_date), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                )}
                                {mission.package_type && (
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                        {mission.package_type}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status & Sync */}
                        <div className="flex flex-col items-end gap-2">
                            <Badge className={`${statusConfig.color} text-white text-xs`}>
                                {statusConfig.label}
                            </Badge>
                            <SyncIcon className={`h-4 w-4 ${syncConfig.color}`} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
