import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { PipelineRealtimeProvider } from "@/contexts/PipelineRealtimeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Eager — auth + landing
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";

// Lazy — tokenized client routes (no auth required)
const CustomerProposal = lazy(() => import("./pages/CustomerProposal"));
const CustomerInvoice = lazy(() => import("./pages/CustomerInvoice"));
const DroneUpload = lazy(() => import("./pages/DroneUpload"));
const ClientJobPortal = lazy(() => import("./pages/ClientJobPortal"));

// Lazy — admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ServiceRequests = lazy(() => import("./pages/admin/ServiceRequests"));
const Proposals = lazy(() => import("./pages/admin/Proposals"));
const Projects = lazy(() => import("./pages/admin/Projects"));
const DroneJobs = lazy(() => import("./pages/admin/DroneJobs"));
const DroneJobDetail = lazy(() => import("./pages/admin/DroneJobDetail"));
const People = lazy(() => import("./pages/admin/People"));
const Messages = lazy(() => import("./pages/admin/Messages"));
const Apps = lazy(() => import("./pages/admin/Apps"));
const Announcements = lazy(() => import("./pages/admin/Announcements"));
const Documents = lazy(() => import("./pages/admin/Documents"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Invoices = lazy(() => import("./pages/admin/Invoices"));
const PilotManagement = lazy(() => import("./pages/admin/PilotManagement"));
const Pipeline = lazy(() => import("./pages/admin/Pipeline"));
const PipelineQAReview = lazy(() => import("./pages/admin/PipelineQAReview"));
const PipelineCoverageReview = lazy(() => import("./pages/admin/PipelineCoverageReview"));
const SentinelPricing = lazy(() => import("./pages/admin/SentinelPricing"));
const Clients = lazy(() => import("./pages/admin/Clients"));
const JobIntake = lazy(() => import("./pages/admin/JobIntake"));
const ProcessingTemplates = lazy(() => import("./pages/admin/ProcessingTemplates"));
const DeliveryReview = lazy(() => import("./pages/admin/DeliveryReview"));
const QuoteRequests = lazy(() => import("./pages/admin/QuoteRequests"));

// Lazy — pilot pages
const PilotDashboard = lazy(() => import("./pages/pilot/PilotDashboard"));
const PilotMissionDetail = lazy(() => import("./pages/pilot/PilotMissionDetail"));
const FleetOverview = lazy(() => import("./components/pilot/FleetOverview"));
const MaintenanceHistory = lazy(() => import("./components/pilot/MaintenanceHistory"));

import DefaultHelmet from "./components/seo/DefaultHelmet";
import PWAUpdatePrompt from "./components/pwa/PWAUpdatePrompt";
import PWAInstallPrompt from "./components/pwa/PWAInstallPrompt";

const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

// Role-based redirect — logged-in users go to dashboard, guests see landing page
function RootRedirect() {
  const { user, isAdmin, isPilot, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <LandingPage />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (isPilot) return <Navigate to="/pilot" replace />;
  return <Navigate to="/auth" replace />;
}

// Helper: wrap admin route in ErrorBoundary + ProtectedRoute
function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ProtectedRoute requireAdmin>{children}</ProtectedRoute>
    </ErrorBoundary>
  );
}

// Helper: wrap pilot route in ErrorBoundary + ProtectedRoute
function PilotRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ProtectedRoute requirePilot>{children}</ProtectedRoute>
    </ErrorBoundary>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PipelineRealtimeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />
        <PWAInstallPrompt />
        <BrowserRouter>
          <DefaultHelmet />
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              {/* Root — role-based redirect */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/auth" element={<Auth />} />

              {/* Tokenized client routes — no auth required */}
              <Route path="/proposal/:token" element={<ErrorBoundary><CustomerProposal /></ErrorBoundary>} />
              <Route path="/invoice/:token" element={<ErrorBoundary><CustomerInvoice /></ErrorBoundary>} />
              <Route path="/drone-upload/:token" element={<ErrorBoundary><DroneUpload /></ErrorBoundary>} />
              <Route path="/my-jobs/:token" element={<ErrorBoundary><ClientJobPortal /></ErrorBoundary>} />

              {/* Admin routes */}
              <Route path="/admin/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="/admin/service-requests" element={<AdminRoute><ServiceRequests /></AdminRoute>} />
              <Route path="/admin/proposals" element={<AdminRoute><Proposals /></AdminRoute>} />
              <Route path="/admin/projects" element={<AdminRoute><Projects /></AdminRoute>} />
              <Route path="/admin/drone-jobs" element={<AdminRoute><DroneJobs /></AdminRoute>} />
              <Route path="/admin/drone-jobs/:id" element={<AdminRoute><DroneJobDetail /></AdminRoute>} />
              <Route path="/admin/drone-jobs/:id/delivery" element={<AdminRoute><DeliveryReview /></AdminRoute>} />
              <Route path="/admin/pipeline" element={<AdminRoute><Pipeline /></AdminRoute>} />
              <Route path="/admin/pipeline/qa/:missionId" element={<AdminRoute><PipelineQAReview /></AdminRoute>} />
              <Route path="/admin/pipeline/coverage/:missionId" element={<AdminRoute><PipelineCoverageReview /></AdminRoute>} />
              <Route path="/admin/pilots" element={<AdminRoute><PilotManagement /></AdminRoute>} />
              <Route path="/admin/people" element={<AdminRoute><People /></AdminRoute>} />
              <Route path="/admin/invoices" element={<AdminRoute><Invoices /></AdminRoute>} />
              <Route path="/admin/messages" element={<AdminRoute><Messages /></AdminRoute>} />
              <Route path="/admin/apps" element={<AdminRoute><Apps /></AdminRoute>} />
              <Route path="/admin/announcements" element={<AdminRoute><Announcements /></AdminRoute>} />
              <Route path="/admin/documents" element={<AdminRoute><Documents /></AdminRoute>} />
              <Route path="/admin/pricing" element={<AdminRoute><SentinelPricing /></AdminRoute>} />
              <Route path="/admin/settings" element={<AdminRoute><Settings /></AdminRoute>} />
              <Route path="/admin/clients" element={<AdminRoute><Clients /></AdminRoute>} />
              <Route path="/admin/jobs/new" element={<AdminRoute><JobIntake /></AdminRoute>} />
              <Route path="/admin/processing-templates" element={<AdminRoute><ProcessingTemplates /></AdminRoute>} />
              <Route path="/admin/quote-requests" element={<AdminRoute><QuoteRequests /></AdminRoute>} />

              {/* Pilot portal routes */}
              <Route path="/pilot" element={<PilotRoute><PilotDashboard /></PilotRoute>} />
              <Route path="/pilot/mission/:id" element={<PilotRoute><PilotMissionDetail /></PilotRoute>} />
              <Route path="/pilot/fleet" element={<PilotRoute><FleetOverview /></PilotRoute>} />
              <Route path="/pilot/fleet/maintenance" element={<PilotRoute><MaintenanceHistory /></PilotRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </PipelineRealtimeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
