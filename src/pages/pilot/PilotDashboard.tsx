import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PilotCard from "@/components/pilot/PilotCard";
import MissionCard from "@/components/pilot/MissionCard";

interface Mission {
    id: string;
    client_name: string;
    property_address: string;
    scheduled_date: string | null;
    status: "scheduled" | "in_progress" | "complete" | "canceled";
    drone_packages?: { name: string } | null;
}

export default function PilotDashboard() {
    const { user, pilotProfile, signOut } = useAuth();
    const { toast } = useToast();
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const fetchMissions = async () => {
        if (!user) {
            console.log("PilotDashboard: No user found, skipping fetch");
            return;
        }

        console.log("PilotDashboard: Fetching missions for pilot:", user.id);
        setLoading(true);

        const { data, error } = await supabase
            .from("drone_jobs")
            .select("id, customers(name), property_address, scheduled_date, status, drone_packages(name)")
            .eq("pilot_id", user.id)
            .neq("status", "canceled")
            .order("scheduled_date", { ascending: true });

        if (error) {
            console.error("PilotDashboard: Error fetching missions:", error);
            toast({
                title: "Error loading missions",
                description: error.message,
                variant: "destructive",
            });
        } else if (data) {
            console.log("PilotDashboard: Missions fetched:", data.length);
            // Transform data to match our interface
            const transformed = data.map((job: any) => ({
                id: job.id,
                client_name: job.customers?.name || "Unknown Client",
                property_address: job.property_address,
                scheduled_date: job.scheduled_date,
                status: job.status as Mission["status"],
                drone_packages: job.drone_packages,
            }));
            setMissions(transformed);

            // Cache to localStorage for offline use
            localStorage.setItem("trestle_missions", JSON.stringify(transformed));
        }

        setLoading(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        await fetchMissions();
        setSyncing(false);
        toast({ title: "Sync complete" });
    };

    // Load cached missions first, then fetch fresh data
    useEffect(() => {
        const cached = localStorage.getItem("trestle_missions");
        if (cached) {
            try {
                setMissions(JSON.parse(cached));
            } catch {
                // Invalid cache, ignore
            }
        }

        if (isOnline) {
            fetchMissions();
        } else {
            setLoading(false);
        }
    }, [user, isOnline]);

    const handleLogout = async () => {
        // Clear local data on logout (security requirement)
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
                    <div className="flex items-center gap-2">
                        {!isOnline && (
                            <div className="flex items-center gap-1 text-muted-foreground text-sm">
                                <WifiOff className="h-4 w-4" />
                                <span className="hidden sm:inline">Offline</span>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleSync}
                            disabled={syncing || !isOnline}
                        >
                            <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
                        </Button>
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
                    <div className="mb-6">
                        <PilotCard profile={pilotProfile} />
                    </div>
                )}

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
                                    status: mission.status,
                                    package_type: mission.drone_packages?.name,
                                }}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
