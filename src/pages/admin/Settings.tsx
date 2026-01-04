import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, XCircle, RefreshCw, Unlink } from "lucide-react";

export default function Settings() {
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
        description: "Your drone job schedules will now sync automatically.",
      });
      setCalendarConnected(true);
      setCalendarExpired(false);
    }

    // Clean up URL
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

    const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
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
    <div className="min-h-screen bg-background">
      <AdminNav />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="grid gap-6 max-w-2xl">
          {/* Google Calendar Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar Integration
              </CardTitle>
              <CardDescription>
                Sync your drone job schedules with Google Calendar for automatic reminders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Checking connection...
                </div>
              ) : calendarConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
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
                    Scheduled drone jobs will automatically appear in your Google Calendar.
                    You can sync individual jobs from the job detail page.
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
                    Connect your Google Calendar to automatically sync drone job schedules.
                    This will create calendar events with property details, customer info, and pilot notes.
                  </p>

                  <Button onClick={connectCalendar} disabled={connecting}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {connecting ? "Connecting..." : "Connect Google Calendar"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
