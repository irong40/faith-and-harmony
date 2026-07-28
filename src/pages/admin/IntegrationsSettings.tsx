import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageShell from "@/components/admin/PageShell";
import { Calendar, CheckCircle, XCircle, Settings as SettingsIcon, Unlink } from "lucide-react";

// ---------------------------------------------------------------------------
// IntegrationsSettings — the INDEX element of /admin/settings.
//
// This has to stay a real, mountable route rather than a drawer or a tab:
// Google's OAuth consent screen redirects the whole browser to
// `${origin}/admin/settings?code=...`, which is a full page load. React state
// cannot survive that, and an index <Navigate> would strip the ?code= before
// the handler below ever sees it. DroneJobDetail also deep-links here when a
// job cannot sync for want of a calendar connection.
// ---------------------------------------------------------------------------

export default function IntegrationsSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarExpired, setCalendarExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkCalendarConnection();

    // Handle OAuth callback
    const code = searchParams.get("code");
    if (code && user) {
      handleOAuthCallback(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams]);

  const checkCalendarConnection = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
      body: { action: "check-connection", user_id: user.id },
    });

    if (!error && data) {
      setCalendarConnected(data.connected);
      setCalendarExpired(data.expired);
    }
    setLoading(false);
  };

  const handleOAuthCallback = async (code: string) => {
    if (!user) return;
    setConnecting(true);

    // Must match the URI registered with Google exactly — this is why
    // /admin/settings cannot become a query-string or hash route.
    const redirectUri = `${window.location.origin}/admin/settings`;

    const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
      body: {
        action: "exchange-code",
        code,
        redirect_uri: redirectUri,
        user_id: user.id,
      },
    });

    if (error) {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    } else if (data?.success) {
      toast({
        title: "Google Calendar connected!",
        description: "Your mission schedules will now sync automatically.",
      });
      setCalendarConnected(true);
      setCalendarExpired(false);
    }

    // Clean up URL — drops the spent ?code= without a re-render round trip.
    window.history.replaceState({}, "", "/admin/settings");
    setConnecting(false);
  };

  const connectCalendar = async () => {
    if (!user) return;
    setConnecting(true);

    const redirectUri = `${window.location.origin}/admin/settings`;

    const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
      body: { action: "get-auth-url", redirect_uri: redirectUri },
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setConnecting(false);
      return;
    }

    if (data?.auth_url) {
      window.location.href = data.auth_url;
    }
  };

  const disconnectCalendar = async () => {
    if (!user) return;
    setDisconnecting(true);

    const { error } = await supabase.functions.invoke("google-calendar-auth", {
      body: { action: "disconnect", user_id: user.id },
    });

    if (error) {
      toast({
        title: "Error disconnecting",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Google Calendar disconnected" });
      setCalendarConnected(false);
      setCalendarExpired(false);
    }
    setDisconnecting(false);
  };

  const refreshToken = async () => {
    if (!user) return;
    setConnecting(true);

    const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
      body: { action: "refresh-token", user_id: user.id },
    });

    if (error) {
      toast({
        title: "Refresh failed",
        description: "Please reconnect your calendar.",
        variant: "destructive",
      });
      setCalendarExpired(true);
    } else if (data?.success) {
      toast({ title: "Token refreshed" });
      setCalendarExpired(false);
    }
    setConnecting(false);
  };

  return (
    <PageShell
      title="Settings"
      description="Integrations and account-level configuration"
      icon={SettingsIcon}
      width="narrow"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>
            Sync mission schedules with Google Calendar for automatic reminders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3" role="status" aria-busy="true">
              <span className="sr-only">Checking calendar connection</span>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full max-w-sm" />
              <Skeleton className="h-9 w-44" />
            </div>
          ) : calendarConnected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {calendarExpired ? (
                  <>
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Token Expired
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshToken}
                      disabled={connecting}
                    >
                      {connecting ? "Refreshing..." : "Refresh Token"}
                    </Button>
                  </>
                ) : (
                  <Badge className="gap-1 bg-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Connected
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Scheduled missions will automatically appear in your Google Calendar.
                You can sync individual missions from the mission detail page.
              </p>

              <Button
                variant="outline"
                size="sm"
                onClick={disconnectCalendar}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive"
              >
                <Unlink className="mr-2 h-4 w-4" />
                {disconnecting ? "Disconnecting..." : "Disconnect Calendar"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Google Calendar to automatically sync mission schedules.
                This creates calendar events with property details, customer info and
                pilot notes.
              </p>

              <Button onClick={connectCalendar} disabled={connecting}>
                <Calendar className="mr-2 h-4 w-4" />
                {connecting ? "Connecting..." : "Connect Google Calendar"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
