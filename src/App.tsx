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
import RequestService from "./pages/RequestService";
import ServiceRequests from "./pages/admin/ServiceRequests";
import Customers from "./pages/admin/Customers";
import Orders from "./pages/admin/Orders";
import Contact from "./pages/Contact";
import Pricing from "./pages/Pricing";

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
              <Route path="/request-service" element={<RequestService />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route
                path="/admin/service-requests"
                element={
                  <ProtectedRoute requireAdmin>
                    <ServiceRequests />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/customers"
                element={
                  <ProtectedRoute requireAdmin>
                    <Customers />
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
