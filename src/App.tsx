import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Eager — first paint / auth
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy — public pages
const Services = lazy(() => import("./pages/Services"));
const Shop = lazy(() => import("./pages/Shop"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Contact = lazy(() => import("./pages/Contact"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Licensing = lazy(() => import("./pages/Licensing"));
const AerialGallery = lazy(() => import("./pages/AerialGallery"));
const RequestService = lazy(() => import("./pages/RequestService"));
const CustomerProposal = lazy(() => import("./pages/CustomerProposal"));
const CustomerInvoice = lazy(() => import("./pages/CustomerInvoice"));
const DroneUpload = lazy(() => import("./pages/DroneUpload"));
const ClientJobPortal = lazy(() => import("./pages/ClientJobPortal"));

// Lazy — service pages
const AIVideoCreation = lazy(() => import("./pages/services/AIVideoCreation"));
const MasonicDigitalProjects = lazy(() => import("./pages/services/MasonicDigitalProjects"));
const BlackHistoryStorytelling = lazy(() => import("./pages/services/BlackHistoryStorytelling"));
const CybersecurityAI = lazy(() => import("./pages/services/CybersecurityAI"));
const VendorAssistant = lazy(() => import("./pages/services/VendorAssistant"));
const ChurchTech = lazy(() => import("./pages/services/ChurchTech"));
const AerialPhotography = lazy(() => import("./pages/services/AerialPhotography"));
const WebsiteHosting = lazy(() => import("./pages/services/WebsiteHosting"));

// Lazy — admin pages
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ServiceRequests = lazy(() => import("./pages/admin/ServiceRequests"));
const Proposals = lazy(() => import("./pages/admin/Proposals"));
const Projects = lazy(() => import("./pages/admin/Projects"));
const DroneJobs = lazy(() => import("./pages/admin/DroneJobs"));
const DroneJobDetail = lazy(() => import("./pages/admin/DroneJobDetail"));
const DroneLeads = lazy(() => import("./pages/admin/DroneLeads"));
const DroneCRMDashboard = lazy(() => import("./pages/admin/DroneCRMDashboard"));
const Orders = lazy(() => import("./pages/admin/Orders"));
const People = lazy(() => import("./pages/admin/People"));
const Offerings = lazy(() => import("./pages/admin/Offerings"));
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <PWAUpdatePrompt />
          <PWAInstallPrompt />
          <BrowserRouter>
            <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/services" element={<Services />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/shop/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/services/ai-video-creation" element={<AIVideoCreation />} />
              <Route path="/services/masonic-digital-projects" element={<MasonicDigitalProjects />} />
              <Route path="/services/black-history-storytelling" element={<BlackHistoryStorytelling />} />
              <Route path="/services/cybersecurity-ai" element={<CybersecurityAI />} />
              <Route path="/services/vendor-assistant" element={<VendorAssistant />} />
              <Route path="/services/church-tech" element={<ChurchTech />} />
              <Route path="/services/aerial-photography" element={<AerialPhotography />} />
              <Route path="/services/website-hosting" element={<WebsiteHosting />} />
              <Route path="/gallery/aerial-art" element={<AerialGallery />} />
              <Route path="/request-service" element={<RequestService />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/licensing" element={<Licensing />} />
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
                path="/admin/drone-leads"
                element={
                  <ProtectedRoute requireAdmin>
                    <DroneLeads />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/drone-crm"
                element={
                  <ProtectedRoute requireAdmin>
                    <DroneCRMDashboard />
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
                path="/admin/offerings"
                element={
                  <ProtectedRoute requireAdmin>
                    <Offerings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute requireAdmin>
                    <Orders />
                  </ProtectedRoute>
                }
              />
              <Route path="/proposal/:token" element={<CustomerProposal />} />
              <Route path="/invoice/:token" element={<CustomerInvoice />} />
              <Route path="/drone-upload/:token" element={<DroneUpload />} />
              <Route path="/my-jobs/:token" element={<ClientJobPortal />} />
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
              {/* Pilot Portal Routes */}
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
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
