import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Services from "./pages/Services";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Auth from "./pages/Auth";
import AIVideoCreation from "./pages/services/AIVideoCreation";
import MasonicDigitalProjects from "./pages/services/MasonicDigitalProjects";
import BlackHistoryStorytelling from "./pages/services/BlackHistoryStorytelling";
import CybersecurityAI from "./pages/services/CybersecurityAI";
import VendorAssistant from "./pages/services/VendorAssistant";
import ChurchTech from "./pages/services/ChurchTech";

import AerialPhotography from "./pages/services/AerialPhotography";
import WebsiteHosting from "./pages/services/WebsiteHosting";
import AerialGallery from "./pages/AerialGallery";
import RequestService from "./pages/RequestService";
import Dashboard from "./pages/admin/Dashboard";
import ServiceRequests from "./pages/admin/ServiceRequests";
import Proposals from "./pages/admin/Proposals";
import Projects from "./pages/admin/Projects";
import DroneJobs from "./pages/admin/DroneJobs";
import DroneJobDetail from "./pages/admin/DroneJobDetail";
import DroneLeads from "./pages/admin/DroneLeads";
import DroneCRMDashboard from "./pages/admin/DroneCRMDashboard";
import Orders from "./pages/admin/Orders";
import People from "./pages/admin/People";
import Offerings from "./pages/admin/Offerings";
import Messages from "./pages/admin/Messages";
import Apps from "./pages/admin/Apps";
import Announcements from "./pages/admin/Announcements";
import Documents from "./pages/admin/Documents";
import Settings from "./pages/admin/Settings";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";
import Licensing from "./pages/Licensing";
import CustomerProposal from "./pages/CustomerProposal";
import CustomerInvoice from "./pages/CustomerInvoice";
import DroneUpload from "./pages/DroneUpload";
import ClientJobPortal from "./pages/ClientJobPortal";
import Invoices from "./pages/admin/Invoices";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
                path="/admin/settings"
                element={
                  <ProtectedRoute requireAdmin>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
