import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Shield, AlertTriangle } from "lucide-react";
import { PilotProfile, getCertificationStatus, getDaysUntilExpiry, CertificationStatus } from "@/types/pilot";
import { format } from "date-fns";

interface PilotCardProps {
    profile: PilotProfile;
}

const STATUS_CONFIG: Record<CertificationStatus, { label: string; color: string; bgColor: string }> = {
    valid: { label: "Active", color: "text-green-500", bgColor: "bg-green-500/10" },
    expiring_soon: { label: "Renew Soon", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    expiring_warning: { label: "Expiring", color: "text-orange-500", bgColor: "bg-orange-500/10" },
    expired: { label: "Expired", color: "text-red-500", bgColor: "bg-red-500/10" },
};

export default function PilotCard({ profile }: PilotCardProps) {
    const certStatus = getCertificationStatus(profile.part_107_expiry);
    const daysUntil = getDaysUntilExpiry(profile.part_107_expiry);
    const statusConfig = STATUS_CONFIG[certStatus];

    return (
        <Card className="bg-card border-border">
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-7 w-7 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                            {profile.full_name || "Pilot"}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                                Part 107: {profile.part_107_number || "Not Set"}
                            </span>
                        </div>
                    </div>

                    {/* Certification Status */}
                    <div className="flex-shrink-0">
                        <Badge
                            variant="secondary"
                            className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                        >
                            {certStatus === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {statusConfig.label}
                        </Badge>
                        {profile.part_107_expiry && (
                            <p className={`text-xs text-center mt-1 ${certStatus === 'expired' ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {certStatus === 'expired'
                                    ? `Expired ${format(new Date(profile.part_107_expiry), "MMM d, yyyy")}`
                                    : daysUntil !== null && daysUntil <= 90
                                        ? `${daysUntil} days left`
                                        : format(new Date(profile.part_107_expiry), "MMM yyyy")
                                }
                            </p>
                        )}
                    </div>
                </div>

                {/* Expired Warning Banner */}
                {certStatus === 'expired' && (
                    <div className="mt-3 p-2 rounded-md bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-500 text-center">
                            Flight logging is disabled until certification is renewed
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
