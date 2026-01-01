import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Wifi, WifiOff, HardDrive, Camera, Palette } from "lucide-react";

interface AgentHealth {
  status: "healthy" | "offline" | "error";
  lightroom: "running" | "available" | "not_found";
  photoshop: "available" | "not_found";
  disk_space_gb: number;
  active_jobs: number;
}

interface AgentStatusCardProps {
  agentUrl?: string;
}

export default function AgentStatusCard({ agentUrl }: AgentStatusCardProps) {
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = async () => {
    if (!agentUrl) {
      setHealth(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${agentUrl}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      } else {
        setHealth({ 
          status: "error", 
          lightroom: "not_found", 
          photoshop: "not_found", 
          disk_space_gb: 0, 
          active_jobs: 0 
        });
      }
    } catch {
      setHealth({ 
        status: "offline", 
        lightroom: "not_found", 
        photoshop: "not_found", 
        disk_space_gb: 0, 
        active_jobs: 0 
      });
    } finally {
      setLoading(false);
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    checkHealth();
    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [agentUrl]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "running":
      case "available":
        return "bg-green-500";
      case "offline":
      case "not_found":
        return "bg-muted";
      case "error":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "healthy":
        return "Connected";
      case "offline":
        return "Offline";
      case "error":
        return "Error";
      default:
        return status;
    }
  };

  if (!agentUrl) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Local Processing Agent
          </CardTitle>
          <CardDescription>Not configured</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure LOCAL_AGENT_URL to enable local Lightroom/Photoshop processing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {health?.status === "healthy" ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              )}
              Local Processing Agent
            </CardTitle>
            <CardDescription className="mt-1">
              {lastCheck ? `Last checked: ${lastCheck.toLocaleTimeString()}` : "Checking..."}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={checkHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {health ? (
          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={getStatusColor(health.status)}>
                {getStatusLabel(health.status)}
              </Badge>
            </div>

            {/* Lightroom */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Camera className="h-3.5 w-3.5" />
                Lightroom
              </span>
              <Badge variant="outline" className={health.lightroom === "running" ? "border-green-500 text-green-600" : ""}>
                {health.lightroom === "running" ? "Running" : health.lightroom === "available" ? "Available" : "Not Found"}
              </Badge>
            </div>

            {/* Photoshop */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Palette className="h-3.5 w-3.5" />
                Photoshop
              </span>
              <Badge variant="outline" className={health.photoshop === "available" ? "border-green-500 text-green-600" : ""}>
                {health.photoshop === "available" ? "Available" : "Not Found"}
              </Badge>
            </div>

            {/* Active Jobs */}
            {health.active_jobs > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Jobs</span>
                <Badge variant="secondary">{health.active_jobs}</Badge>
              </div>
            )}

            {/* Disk Space */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Disk Space</span>
              <span className={`text-sm font-medium ${health.disk_space_gb < 20 ? "text-destructive" : ""}`}>
                {health.disk_space_gb} GB free
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
