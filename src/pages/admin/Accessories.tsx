import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Wrench, Plus, RefreshCw } from "lucide-react";
import PageShell from "@/components/admin/PageShell";
import AccessoriesManager from "@/components/admin/AccessoriesManager";

/**
 * /admin/settings/accessories — the settings entry point for fleet accessories.
 * The table itself is AccessoriesManager, shared with the fleet inventory view
 * so the two cannot drift apart again.
 */
export default function Accessories() {
  const queryClient = useQueryClient();
  const [addSignal, setAddSignal] = useState(0);

  return (
    <PageShell
      title="Accessories"
      description="Filters, lenses, pads and everything else that flies with the aircraft"
      icon={Wrench}
      breadcrumbs={[{ label: "Settings", href: "/admin/settings" }, { label: "Accessories" }]}
      width="wide"
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["fleet-accessories-all"] })
            }
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddSignal((n) => n + 1)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Accessory
          </Button>
        </>
      }
    >
      <AccessoriesManager openFormSignal={addSignal} />
    </PageShell>
  );
}
