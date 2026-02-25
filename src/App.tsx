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
import { Loader2 } from "lucide-react";

// Eager — auth
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

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

// Lazy — pilot pages
const PilotDashboard = lazy(() => import("./pages/pilot/PilotDashboard"));
const PilotMissionDetail = lazy(() => import("./pages/pilot/PilotMissionDetail"));
const FleetOverview = lazy(() => import("./components/pilot/FleetOverview"));
const MaintenanceHistory = lazy(() => import("./components/pilot/MaintenanceHistory"));

import PWAUpdatePrompt from "./components/pwa/PWAUpdatePrompt";
import PWAInstallPrompt from "./components/pwa/PWAInstallPrompt";

const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

// Role-based redirect from root
function RootRedirect() {
  const { user, isAdmin, isPilot, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
  if (isPilot) return <Navigate to="/pilot" replace />;
  return <Navigate to="/auth" replace />;
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
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              {/* Root — role-based redirect */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/auth" element={<Auth />} />

              {/* Tokenized client routes — no auth required */}
              <Route path="/proposal/:token" element={<CustomerProposal />} />
              <Route path="/invoice/:token" element={<CustomerInvoice />} />
              <Route path="/drone-upload/:token" element={<DroneUpload />} />
              <Route path="/my-jobs/:token" element={<ClientJobPortal />} />

              {/* Admin routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requireAdmin>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/service-requests"
                element={
                  <ProtectedRoute requireAdmin>
                    <ServiceRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/proposals"
                element={
                  <ProtectedRoute requireAdmin>
                    <Proposals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/projects"
                element={
                  <ProtectedRoute requireAdmin>
                    <Projects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drone-jobs"
                element={
                  <ProtectedRoute requireAdmin>
                    <DroneJobs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drone-jobs/:id"
                element={
                  <ProtectedRoute requireAdmin>
                    <DroneJobDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drone-jobs/:id/delivery"
                element={
                  <ProtectedRoute requireAdmin>
                    <DeliveryReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pipeline"
                element={
                  <ProtectedRoute requireAdmin>
                    <Pipeline />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pipeline/qa/:missionId"
                element={
                  <ProtectedRoute requireAdmin>
                    <PipelineQAReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pipeline/coverage/:missionId"
                element={
                  <ProtectedRoute requireAdmin>
                    <PipelineCoverageReview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pilots"
                element={
                  <ProtectedRoute requireAdmin>
                    <PilotManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/people"
                element={
                  <ProtectedRoute requireAdmin>
                    <People />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/invoices"
                element={
                  <ProtectedRoute requireAdmin>
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/messages"
                element={
                  <ProtectedRoute requireAdmin>
                    <Messages />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/apps"
                element={
                  <ProtectedRoute requireAdmin>
                    <Apps />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedRoute requireAdmin>
                    <Announcements />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/documents"
                element={
                  <ProtectedRoute requireAdmin>
                    <Documents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pricing"
                element={
                  <ProtectedRoute requireAdmin>
                    <SentinelPricing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requireAdmin>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/clients"
                element={
                  <ProtectedRoute requireAdmin>
                    <Clients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/jobs/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <JobIntake />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/processing-templates"
                element={
                  <ProtectedRoute requireAdmin>
                    <ProcessingTemplates />
                  </ProtectedRoute>
                }
              />

              {/* Pilot portal routes */}
              <Route
                path="/pilot"
                element={
                  <ProtectedRoute requirePilot>
                    <PilotDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pilot/mission/:id"
                element={
                  <ProtectedRoute requirePilot>
                    <PilotMissionDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pilot/fleet"
                element={
                  <ProtectedRoute requirePilot>
                    <FleetOverview />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pilot/fleet/maintenance"
                element={
                  <ProtectedRoute requirePilot>
                    <MaintenanceHistory />
                  </ProtectedRoute>
                }
              />

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
