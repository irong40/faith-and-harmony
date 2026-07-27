import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";
import { adminRedirectRoutes } from "@/routes/adminRedirects";

// Eager — auth + landing
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";

// Lazy — tokenized client routes (no auth required)
const LiveProjects = lazy(() => import('./pages/Projects'));
const CustomerProposal = lazy(() => import("./pages/CustomerProposal"));
const CustomerInvoice = lazy(() => import("./pages/CustomerInvoice"));
const DroneUpload = lazy(() => import("./pages/DroneUpload"));
const ClientJobPortal = lazy(() => import("./pages/ClientJobPortal"));
const QuoteAcceptancePage = lazy(() => import("./pages/QuoteAcceptancePage"));
const RequestQuote = lazy(() => import("./pages/RequestQuote"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

// Lazy — admin shell + pages
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ServiceRequests = lazy(() => import("./pages/admin/ServiceRequests"));
const DroneJobs = lazy(() => import("./pages/admin/DroneJobs"));
const DroneJobDetail = lazy(() => import("./pages/admin/DroneJobDetail"));
const Documents = lazy(() => import("./pages/admin/Documents"));
const IntegrationsSettings = lazy(() => import("./pages/admin/IntegrationsSettings"));
const PilotManagement = lazy(() => import("./pages/admin/PilotManagement"));
const SentinelPricing = lazy(() => import("./pages/admin/SentinelPricing"));
const Clients = lazy(() => import("./pages/admin/Clients"));
const JobIntake = lazy(() => import("./pages/admin/JobIntake"));
const ProcessingTemplates = lazy(() => import("./pages/admin/ProcessingTemplates"));
const DeliveryReview = lazy(() => import("./pages/admin/DeliveryReview"));
const Pipeline = lazy(() => import("./pages/admin/Pipeline"));
const CalendarOps = lazy(() => import("./pages/admin/CalendarOps"));
const AdminLeads = lazy(() => import("./pages/admin/Leads"));
const Accessories = lazy(() => import("./pages/admin/Accessories"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const ReportBuilder = lazy(() => import("./pages/admin/ReportBuilder"));

// Lazy — pilot pages
const PilotDashboard = lazy(() => import("./pages/pilot/PilotDashboard"));
const PilotMissionDetail = lazy(() => import("./pages/pilot/PilotMissionDetail"));
const PilotMap = lazy(() => import("./pages/pilot/PilotMap"));
const PilotRouteOptimizer = lazy(() => import("./pages/pilot/PilotRouteOptimizer"));
const PortfolioFlights = lazy(() => import("./pages/pilot/PortfolioFlights"));
const FleetOverview = lazy(() => import("./components/pilot/FleetOverview"));
const MaintenanceHistory = lazy(() => import("./components/pilot/MaintenanceHistory"));

import DefaultHelmet from "./components/seo/DefaultHelmet";
import PWAUpdatePrompt from "./components/pwa/PWAUpdatePrompt";
import PWAInstallPrompt from "./components/pwa/PWAInstallPrompt";
import GoogleMapsProvider from "./components/map/GoogleMapsProvider";

const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

const isTrestleDomain = () => window.location.hostname.includes('trestle');

// Role-based redirect — logged-in users go to dashboard, guests see landing page
function RootRedirect() {
  const { user, isAdmin, isPilot, loading } = useAuth();
  if (loading) return <PageSpinner />;
  if (!user) {
    if (isTrestleDomain()) return <Navigate to="/auth" replace />;
    return <LandingPage />;
  }
  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isPilot) return <Navigate to="/pilot" replace />;
  // User is authenticated but has no admin/pilot role — show landing page on F&H domain,
  // or redirect to auth on Trestle domain (auth page will show "no role" state)
  if (isTrestleDomain()) return <Navigate to="/auth" replace />;
  return <LandingPage />;
}

// Helper: wrap pilot route in ErrorBoundary + ProtectedRoute
function PilotRoute({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ProtectedRoute requirePilot>{children}</ProtectedRoute>
    </ErrorBoundary>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Was bare: staleTime 0 + refetch-on-focus meant every tab return and
      // every remount refired every query, which is most of the perceived
      // flicker across the admin portal.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GoogleMapsProvider>
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
              <Route path="/projects" element={<LiveProjects />} />
              <Route path="/quote" element={<ErrorBoundary><RequestQuote /></ErrorBoundary>} />
              <Route path="/privacy" element={<ErrorBoundary><Privacy /></ErrorBoundary>} />
              <Route path="/terms" element={<ErrorBoundary><Terms /></ErrorBoundary>} />

              {/* Tokenized client routes — no auth required */}
              <Route path="/proposal/:token" element={<ErrorBoundary><CustomerProposal /></ErrorBoundary>} />
              <Route path="/invoice/:token" element={<ErrorBoundary><CustomerInvoice /></ErrorBoundary>} />
              <Route path="/drone-upload/:token" element={<ErrorBoundary><DroneUpload /></ErrorBoundary>} />
              <Route path="/my-jobs/:token" element={<ErrorBoundary><ClientJobPortal /></ErrorBoundary>} />
              <Route path="/quote/:token" element={<ErrorBoundary><QuoteAcceptancePage /></ErrorBoundary>} />

              {/* Admin routes — nested under the persistent AdminLayout shell.
                  Every path below is byte-identical to the previous flat routes. */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                {/* Dashboard IS /admin. The old /admin/dashboard is a stored
                    URL, so it redirects here rather than the other way round. */}
                <Route index element={<Dashboard />} />

                {/* Pipeline — inbound demand */}
                <Route path="pipeline" element={<Pipeline />} />
                <Route path="pipeline/leads" element={<AdminLeads />} />
                <Route path="service-requests" element={<ServiceRequests />} />

                {/* Missions — was drone-jobs */}
                <Route path="missions" element={<DroneJobs />} />
                <Route path="missions/new" element={<JobIntake />} />
                <Route path="missions/:id" element={<DroneJobDetail />} />
                <Route path="missions/:id/delivery" element={<DeliveryReview />} />
                <Route path="calendar" element={<CalendarOps />} />
                <Route path="pilots" element={<PilotManagement />} />

                {/* Clients */}
                <Route path="clients" element={<Clients />} />

                {/* Reports */}
                <Route path="documents" element={<Documents />} />
                <Route path="reports" element={<Reports />} />
                <Route path="reports/new" element={<ReportBuilder />} />
                <Route path="reports/:id/edit" element={<ReportBuilder />} />

                {/* Settings — REAL nested routes, not a drawer.
                    Google's OAuth consent screen redirects the whole browser
                    to /admin/settings?code=..., so the index has to render
                    IntegrationsSettings directly: an index <Navigate> would
                    strip ?code= before the exchange handler ever runs. */}
                <Route path="settings">
                  <Route index element={<IntegrationsSettings />} />
                  <Route path="templates" element={<ProcessingTemplates />} />
                  <Route path="pricing" element={<SentinelPricing />} />
                  <Route path="accessories" element={<Accessories />} />
                  <Route path="fleet" element={<FleetOverview />} />
                </Route>
              </Route>

              {/* Retired admin paths. These are permanent: notifications.link
                  holds stored rows pointing at old URLs, so these must keep
                  resolving (with search + hash intact) indefinitely. */}
              {/* Embedded as a bare array, NOT wrapped in a fragment:
                  createRoutesFromChildren walks React.Children, which flattens
                  arrays into individual <Route> elements. */}
              {adminRedirectRoutes()}

              {/* Pilot portal routes */}
              <Route path="/pilot" element={<PilotRoute><PilotDashboard /></PilotRoute>} />
              <Route path="/pilot/mission/:id" element={<PilotRoute><PilotMissionDetail /></PilotRoute>} />
              <Route path="/pilot/map" element={<PilotRoute><PilotMap /></PilotRoute>} />
              <Route path="/pilot/route" element={<PilotRoute><PilotRouteOptimizer /></PilotRoute>} />
              <Route path="/pilot/portfolio" element={<PilotRoute><PortfolioFlights /></PilotRoute>} />
              <Route path="/pilot/fleet" element={<PilotRoute><FleetOverview /></PilotRoute>} />
              <Route path="/pilot/fleet/maintenance" element={<PilotRoute><MaintenanceHistory /></PilotRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </GoogleMapsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
