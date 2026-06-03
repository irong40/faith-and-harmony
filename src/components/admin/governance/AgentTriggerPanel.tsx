import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield, DollarSign, FileText, PenTool } from "lucide-react";
import { toast } from "sonner";

const agents = [
  {
    name: "Compliance Sentinel",
    key: "sentinel",
    envVar: "VITE_N8N_SENTINEL_WEBHOOK",
    icon: Shield,
    description: "Scan obligations and send compliance reminders",
  },
  {
    name: "Financial Analyst",
    key: "financial",
    envVar: "VITE_N8N_FINANCIAL_WEBHOOK",
    icon: DollarSign,
    description: "Generate monthly financial report",
  },
  {
    name: "Governance Scribe",
    key: "scribe",
    envVar: "VITE_N8N_SCRIBE_WEBHOOK",
    icon: FileText,
    description: "Generate quarterly meeting minutes",
  },
  {
    name: "Document Drafter",
    key: "drafter",
    envVar: "VITE_N8N_DRAFTER_WEBHOOK",
    icon: PenTool,
    description: "Draft a governance document on demand",
  },
] as const;

export default function AgentTriggerPanel() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function triggerAgent(agent: (typeof agents)[number]) {
    const webhookUrl = import.meta.env[agent.envVar] as string | undefined;

    if (!webhookUrl) {
      toast.error(`Webhook URL not configured for ${agent.name}`);
      return;
    }

    setLoadingKey(agent.key);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          triggered_from: "trestle_admin",
          agent: agent.key,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`${agent.name} triggered successfully`);
    } catch {
      toast.error(`Failed to trigger ${agent.name}`);
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {agents.map((agent) => {
        const Icon = agent.icon;
        const isLoading = loadingKey === agent.key;
        const isConfigured = !!import.meta.env[agent.envVar];

        return (
          <Card key={agent.key}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{agent.name}</CardTitle>
              </div>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => triggerAgent(agent)}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Triggering...
                  </>
                ) : (
                  "Trigger"
                )}
              </Button>
              {!isConfigured && (
                <p className="text-xs text-muted-foreground mt-2">Not configured</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
