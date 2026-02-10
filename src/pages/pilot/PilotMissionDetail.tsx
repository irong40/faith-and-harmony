import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft, MapPin, Calendar, Package, FileText,
    RefreshCw, Navigation, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SOPChecklist from "@/components/pilot/SOPChecklist";
import GatekeeperButton from "@/components/pilot/GatekeeperButton";
import PreFlightAccordion from "@/components/pilot/PreFlightAccordion";
import { getCertificationStatus } from "@/types/pilot";
import type { ChecklistData, PreFlightData } from "@/types/pilot";
import { usePilotMission } from "@/hooks/usePilotMissions";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    scheduled: { label: "SCHEDULED", color: "bg-blue-500" },
    in_progress: { label: "IN PROGRESS", color: "bg-orange-500" },
    complete: { label: "COMPLETE", color: "bg-green-500" },
    canceled: { label: "CANCELED", color: "bg-gray-500" },
};

export default function PilotMissionDetail() {
    const { id } = useParams<{ id: string }>();
    const { user, pilotProfile } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    // TanStack Query for mission data
    const { data: mission, isLoading: loading } = usePilotMission(id);

    const [checklistComplete, setChecklistComplete] = useState(false);
    const [checklistData, setChecklistData] = useState<ChecklistData | null>(null);
    const [preFlightData, setPreFlightData] = useState<PreFlightData>({
        equipment: null,
        weatherLog: null,
        authorization: null,
    });
    const [logging, setLogging] = useState(false);

    // Check if pilot can log flights (Part 107 not expired)
    const certStatus = getCertificationStatus(pilotProfile?.part_107_expiry ?? null);
    const canLogFlights = certStatus !== "expired";

    const openInMaps = () => {
        if (!mission) return;

        const address = [
            mission.property_address,
            mission.property_city,
            mission.property_state,
            mission.property_zip,
        ].filter(Boolean).join(", ");

        const encoded = encodeURIComponent(address);

        const userAgent = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);

        if (isIOS) {
            window.open(`maps://maps.apple.com/?daddr=${encoded}`, "_blank");
        } else {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`, "_blank");
        }
    };

    const handleLogFlight = async () => {
        if (!mission || !user || !checklistData) return;

        setLogging(true);

        try {
            let deviceId = localStorage.getItem("trestle_device_id");
            if (!deviceId) {
                deviceId = crypto.randomUUID();
                localStorage.setItem("trestle_device_id", deviceId);
            }

            const { error: logError } = await supabase
                .from("flight_logs")
                .insert({
                    mission_id: mission.id,
                    pilot_id: user.id,
                    checklist_data: checklistData,
                    device_id: deviceId,
                });

            if (logError) throw logError;

            const { error: updateError } = await supabase
                .from("drone_jobs")
                .update({ status: "complete" })
                .eq("id", mission.id);

            if (updateError) throw updateError;

            localStorage.removeItem(`trestle_checklist_${mission.id}`);

            if ("vibrate" in navigator) {
                navigator.vibrate([50, 50, 100]);
            }

            toast({
                title: "Flight logged successfully",
                description: "Mission marked as complete",
            });

            navigate("/pilot");

        } catch (error: any) {
            toast({
                title: "Error logging flight",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLogging(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!mission) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Mission not found</p>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[mission.status] || STATUS_CONFIG.scheduled;
    const isComplete = mission.status === "complete";

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
                <div className="container mx-auto px-4 py-3 flex items-center gap-3">
                    <Link to="/pilot">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="font-semibold text-foreground">{mission.job_number}</h1>
                        <p className="text-xs text-muted-foreground truncate">
                            {mission.client_name}
                        </p>
                    </div>
                    <Badge className={`${statusConfig.color} text-white`}>
                        {statusConfig.label}
                    </Badge>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
                {/* Mission Info */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Mission Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Address with Open in Maps */}
                        <div>
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="font-medium">{mission.property_address}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {[mission.property_city, mission.property_state, mission.property_zip]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={openInMaps}
                            >
                                <Navigation className="mr-2 h-4 w-4" />
                                Open in Maps
                                <ExternalLink className="ml-2 h-3 w-3" />
                            </Button>
                        </div>

                        <Separator />

                        {/* Date & Time */}
                        {mission.scheduled_date && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    {format(new Date(mission.scheduled_date), "EEEE, MMMM d, yyyy")}
                                    {mission.scheduled_time && ` at ${mission.scheduled_time}`}
                                </span>
                            </div>
                        )}

                        {/* Package Type */}
                        {mission.package_name && (
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span>{mission.package_name}</span>
                                {mission.package_code && (
                                    <Badge variant="secondary" className="text-xs">
                                        {mission.package_code}
                                    </Badge>
                                )}
                            </div>
                        )}

                        {/* Pilot Notes */}
                        {mission.pilot_notes && (
                            <>
                                <Separator />
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium text-muted-foreground">Notes</span>
                                    </div>
                                    <p className="text-sm bg-muted/50 p-3 rounded-lg">
                                        {mission.pilot_notes}
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Pre-Flight Accordion */}
                {!isComplete && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Pre-Flight Preparation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PreFlightAccordion
                                missionId={mission.id}
                                packageId={mission.package_id}
                                packageCode={mission.package_code}
                                latitude={mission.latitude}
                                longitude={mission.longitude}
                                nearestStation={mission.nearest_weather_station}
                                onPreFlightData={setPreFlightData}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* SOP Checklist */}
                {!isComplete && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Pre-Flight Checklist</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SOPChecklist
                                missionId={mission.id}
                                disabled={!canLogFlights}
                                preFlightData={preFlightData}
                                onComplete={(data) => {
                                    setChecklistComplete(true);
                                    setChecklistData(data);
                                }}
                                onIncomplete={() => {
                                    setChecklistComplete(false);
                                    setChecklistData(null);
                                }}
                            />
                        </CardContent>
                    </Card>
                )}
            </main>

            {/* Fixed Bottom Button */}
            {!isComplete && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
                    <div className="container mx-auto max-w-2xl">
                        <GatekeeperButton
                            enabled={checklistComplete && canLogFlights}
                            loading={logging}
                            onLogFlight={handleLogFlight}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
