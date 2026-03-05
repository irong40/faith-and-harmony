import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, LogOut, Plane, Play, RotateCcw, Cog, LayoutDashboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isToday, isBefore, startOfDay } from "date-fns";
import PilotCard from "@/components/pilot/PilotCard";
import MissionCard from "@/components/pilot/MissionCard";
import SyncStatusIndicator from "@/components/pilot/SyncStatusIndicator";
import { usePilotMissions } from "@/hooks/usePilotMissions";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useDeadLetterCount } from "@/hooks/useDeadLetterCount";
import { DeadLetterBanner } from "@/components/pilot/DeadLetterBanner";

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface ProcessingStatus {
  id: string;
  mission_id: string;
  status: string;
  path_code: string | null;
  job_number: string;
}

// -------------------------------------------------------
// Quick Actions component
// -------------------------------------------------------
function QuickActions({ missions }: { missions: any[] }) {
    // Find next scheduled mission (today or upcoming)
    const nextScheduled = useMemo(() => {
        return missions
            .filter((m) => m.status === "scheduled" && m.scheduled_date)
            .sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""))
            .find((m) => !isBefore(startOfDay(new Date(m.scheduled_date!)), startOfDay(new Date())));
    }, [missions]);

    // Find in-progress mission (checklist started)
    const inProgress = useMemo(() => {
        return missions.find((m) => m.status === "captured");
    }, [missions]);

    if (!nextScheduled && !inProgress) return null;

    return (
        <div className="mb-4 space-y-2">
            {inProgress && (
                <Link to={`/pilot/mission/${inProgress.id}`} className="block">
                    <Button className="w-full justify-start gap-2 bg-orange-500 hover:bg-orange-600 text-white">
                        <RotateCcw className="h-4 w-4" />
                        Resume Checklist — {inProgress.job_number}
                    </Button>
                </Link>
            )}
            {nextScheduled && !inProgress && (
                <Link to={`/pilot/mission/${nextScheduled.id}`} className="block">
                    <Button className="w-full justify-start gap-2" variant="default">
                        <Play className="h-4 w-4" />
                        Start Pre-Flight — {nextScheduled.job_number}
                    </Button>
                </Link>
            )}
        </div>
    );
}

// -------------------------------------------------------
// Processing status for pilot's missions
// -------------------------------------------------------
function ProcessingStatusCard({ userId }: { userId: string }) {
    const { data: processing, isLoading } = useQuery({
        queryKey: ["pilot-processing-status", userId],
        queryFn: async (): Promise<ProcessingStatus[]> => {
            // Get active processing jobs for this pilot's missions
            const { data, error } = await supabase
                .from("processing_jobs")
                .select("id, mission_id, status, path_code, drone_jobs(job_number, pilot_id)")
                .in("status", ["queued", "running"])
                .order("started_at", { ascending: false })
                .limit(5);
            if (error) throw error;
            // Filter to only this pilot's missions
            return (data || [])
                .filter((pj: any) => pj.drone_jobs?.pilot_id === userId)
                .map((pj: any) => ({
                    id: pj.id,
                    mission_id: pj.mission_id,
                    status: pj.status,
                    path_code: pj.path_code,
                    job_number: pj.drone_jobs?.job_number || "Unknown",
                }));
        },
        staleTime: 30_000,
        refetchInterval: 30_000,
    });

    if (!isLoading && (!processing || processing.length === 0)) return null;

    return (
        <Card className="mb-4">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Cog className="h-4 w-4 text-amber-500" />
                    Processing Status
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                ) : (
                    <div className="space-y-2">
                        {processing!.map((pj) => (
                            <div key={pj.id} className="flex items-center justify-between gap-2 text-sm">
                                <Link to={`/pilot/mission/${pj.mission_id}`} className="font-mono hover:underline text-primary text-xs">
                                    {pj.job_number}
                                </Link>
                                <div className="flex items-center gap-2">
                                    {pj.path_code && (
                                        <Badge variant="outline" className="text-xs font-mono">{pj.path_code}</Badge>
                                    )}
                                    <Badge className={`text-xs ${pj.status === "running" ? "bg-amber-500 text-white" : "bg-slate-400 text-white"}`}>
                                        {pj.status === "running" ? "Processing" : "Queued"}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// -------------------------------------------------------
// Main PilotDashboard
// -------------------------------------------------------
export default function PilotDashboard() {
    const { pilotProfile, user, isAdmin, signOut } = useAuth();
    const { toast } = useToast();

    // TanStack Query for missions (RLS scoped to current pilot)
    const { data: missions = [], isLoading: loading, refetch } = usePilotMissions();

    // Offline sync engine
    const { syncStatus, pendingCount, pendingMissionIds, isOnline, syncNow } = useOfflineSync(pilotProfile?.id);

    // Dead letter visibility
    const { deadLetterCount, retryAll } = useDeadLetterCount();

    const handleSync = async () => {
        await syncNow();
        await refetch();
        toast({ title: "Sync complete" });
    };

    const handleLogout = async () => {
        localStorage.removeItem("trestle_missions");
        localStorage.removeItem("trestle_checklist_state");
        await signOut();
    };

    // Group missions into today / upcoming / past
    const { today, upcoming, past } = useMemo(() => {
        const now = startOfDay(new Date());
        const groups = { today: [] as any[], upcoming: [] as any[], past: [] as any[] };

        for (const m of missions) {
            if (!m.scheduled_date) {
                groups.upcoming.push(m);
                continue;
            }
            const d = startOfDay(new Date(m.scheduled_date));
            if (isToday(d)) groups.today.push(m);
            else if (isBefore(d, now)) groups.past.push(m);
            else groups.upcoming.push(m);
        }

        return groups;
    }, [missions]);

    const renderCard = (mission: any) => (
        <MissionCard
            key={mission.id}
            mission={{
                id: mission.id,
                client_name: mission.client_name,
                address: mission.property_address,
                scheduled_date: mission.scheduled_date,
                status: mission.status as "scheduled" | "captured" | "complete" | "canceled",
                package_type: mission.package_name || undefined,
            }}
            syncStatus={
                !isOnline ? "offline" :
                pendingMissionIds.has(mission.id) ? "pending" :
                "synced"
            }
        />
    );

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/drone/drone-logo-original.jpg"
                            alt="Trestle"
                            className="h-9 w-9 object-contain"
                        />
                        <div>
                            <h1 className="font-semibold text-foreground">Trestle</h1>
                            <p className="text-xs text-muted-foreground">Field Operations</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <SyncStatusIndicator
                            status={syncStatus}
                            pendingCount={pendingCount}
                            isOnline={isOnline}
                            onSync={handleSync}
                        />
                        {isAdmin && (
                            <Link to="/admin/dashboard">
                                <Button variant="ghost" size="icon" title="Admin Dashboard">
                                    <LayoutDashboard className="h-5 w-5" />
                                </Button>
                            </Link>
                        )}
                        <Button variant="ghost" size="icon" onClick={handleLogout}>
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-6 max-w-2xl">
                {/* Pilot Card */}
                {pilotProfile && (
                    <div className="mb-4">
                        <PilotCard profile={pilotProfile} />
                    </div>
                )}

                {/* Dead Letter Warning */}
                <DeadLetterBanner count={deadLetterCount} onRetry={retryAll} />

                {/* Quick Actions — only when missions loaded */}
                {!loading && missions.length > 0 && (
                    <QuickActions missions={missions} />
                )}

                {/* Processing Status for my missions */}
                {user?.id && <ProcessingStatusCard userId={user.id} />}

                {/* Fleet Quick Link */}
                <Link to="/pilot/fleet" className="block mb-6">
                    <Button variant="outline" className="w-full justify-start gap-2">
                        <Plane className="h-4 w-4" />
                        Fleet Inventory
                    </Button>
                </Link>

                {/* Mission List — grouped by Today / Upcoming / Past */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                ) : missions.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No missions assigned</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Check back later or contact your administrator
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {today.length > 0 && (
                            <section>
                                <div className="mb-2 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-foreground">Today</h2>
                                    <span className="text-sm text-muted-foreground">{today.length}</span>
                                </div>
                                <div className="space-y-3">{today.map(renderCard)}</div>
                            </section>
                        )}
                        {upcoming.length > 0 && (
                            <section>
                                <div className="mb-2 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
                                    <span className="text-sm text-muted-foreground">{upcoming.length}</span>
                                </div>
                                <div className="space-y-3">{upcoming.map(renderCard)}</div>
                            </section>
                        )}
                        {past.length > 0 && (
                            <section>
                                <div className="mb-2 flex items-center justify-between">
                                    <h2 className="text-sm font-medium text-muted-foreground">Past</h2>
                                    <span className="text-sm text-muted-foreground">{past.length}</span>
                                </div>
                                <div className="space-y-3 opacity-75">{past.map(renderCard)}</div>
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
