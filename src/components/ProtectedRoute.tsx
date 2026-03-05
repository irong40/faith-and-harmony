import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertTriangle } from "lucide-react";
import { getCertificationStatus } from "@/types/pilot";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requirePilot?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requirePilot = false
}: ProtectedRouteProps) {
  const { user, isAdmin, isPilot, pilotProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  if (requirePilot && !isPilot && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">Pilot Access Required</h1>
          <p className="text-muted-foreground mb-4">
            This area is for registered pilots only. Contact your administrator to request pilot access.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // Check Part 107 certification for pilot routes
  if (requirePilot && pilotProfile) {
    const certStatus = getCertificationStatus(pilotProfile.part_107_expiry);

    if (certStatus === 'expired') {
      return (
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8">
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle>Part 107 Certification Expired</AlertTitle>
              <AlertDescription>
                Your FAA Part 107 certification has expired. You cannot log flights until your certification is renewed.
                Please contact your administrator to update your certification status.
              </AlertDescription>
            </Alert>
            <div className="mt-8">
              {children}
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
