import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut, Plane } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PilotCard from "@/components/pilot/PilotCard";
import MissionCard from "@/components/pilot/MissionCard";
import SyncStatusIndicator from "@/components/pilot/SyncStatusIndicator";
import { usePilotMissions } from "@/hooks/usePilotMissions";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function PilotDashboard() {
    const { pilotProfile, signOut } = useAuth();
    const { toast } = useToast();

    // TanStack Query for missions
    const { data: missions = [], isLoading: loading, refetch } = usePilotMissions();

    // Offline sync engine
    const { syncStatus, pendingCount, isOnline, syncNow } = useOfflineSync(pilotProfile?.id);

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

                {/* Fleet Link */}
                <Link to="/pilot/fleet" className="block mb-6">
                    <Button variant="outline" className="w-full justify-start gap-2">
                        <Plane className="h-4 w-4" />
                        Fleet Inventory
                    </Button>
                </Link>

                {/* Missions Section */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">My Missions</h2>
                    <span className="text-sm text-muted-foreground">
                        {missions.length} {missions.length === 1 ? "mission" : "missions"}
                    </span>
                </div>

                {/* Mission List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : missions.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No missions assigned</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Check back later or contact your administrator
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {missions.map((mission) => (
                            <MissionCard
                                key={mission.id}
                                mission={{
                                    id: mission.id,
                                    client_name: mission.client_name,
                                    address: mission.property_address,
                                    scheduled_date: mission.scheduled_date,
                                    status: mission.status as "scheduled" | "in_progress" | "complete" | "canceled",
                                    package_type: mission.package_name || undefined,
                                }}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
