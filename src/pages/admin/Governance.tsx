import AdminNav from "./components/AdminNav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import ComplianceDashboard from "@/components/admin/governance/ComplianceDashboard";
import AgentTriggerPanel from "@/components/admin/governance/AgentTriggerPanel";
import GovernanceDocuments from "@/components/admin/governance/GovernanceDocuments";
import DecisionsList from "@/components/admin/governance/DecisionsList";

export default function Governance() {
  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Governance</h1>
            <p className="text-muted-foreground">Manage compliance, agents, documents, and decisions</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="decisions">Decisions</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <ComplianceDashboard />
          </TabsContent>

          <TabsContent value="agents">
            <AgentTriggerPanel />
          </TabsContent>

          <TabsContent value="documents">
            <GovernanceDocuments />
          </TabsContent>

          <TabsContent value="decisions">
            <DecisionsList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
