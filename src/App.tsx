import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Services from "./pages/Services";
import AIVideoCreation from "./pages/services/AIVideoCreation";
import MasonicDigitalProjects from "./pages/services/MasonicDigitalProjects";
import BlackHistoryStorytelling from "./pages/services/BlackHistoryStorytelling";
import CybersecurityAI from "./pages/services/CybersecurityAI";
import VendorAssistant from "./pages/services/VendorAssistant";
import ChurchTech from "./pages/services/ChurchTech";
import FinancialCoaching from "./pages/services/FinancialCoaching";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/ai-video-creation" element={<AIVideoCreation />} />
          <Route path="/services/masonic-digital-projects" element={<MasonicDigitalProjects />} />
          <Route path="/services/black-history-storytelling" element={<BlackHistoryStorytelling />} />
          <Route path="/services/cybersecurity-ai" element={<CybersecurityAI />} />
          <Route path="/services/vendor-assistant" element={<VendorAssistant />} />
          <Route path="/services/church-tech" element={<ChurchTech />} />
          <Route path="/services/financial-coaching" element={<FinancialCoaching />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
