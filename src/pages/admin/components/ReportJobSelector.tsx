import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

export interface DroneJobOption {
  id: string;
  job_number: string;
  property_address: string;
  property_type: string;
  client_id: string | null;
  client_name: string | null;
  client_company: string | null;
  scheduled_date: string | null;
  aircraft_name: string | null;
  aircraft_model: string | null;
}

interface JobSelectorProps {
  onSelect: (job: DroneJobOption) => void;
}

export function ReportJobSelector({ onSelect }: JobSelectorProps) {
  const [jobs, setJobs] = useState<DroneJobOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("drone_jobs")
        .select(
          "id, job_number, property_address, property_type, client_id, scheduled_date, clients(name, company), aircraft:aircraft_id(nickname, model)"
        )
        .order("scheduled_date", { ascending: false })
        .limit(200);
      setJobs(
        (data ?? []).map((j: any) => ({
          id: j.id,
          job_number: j.job_number,
          property_address: j.property_address,
          property_type: j.property_type,
          client_id: j.client_id,
          client_name: j.clients?.name ?? null,
          client_company: j.clients?.company ?? null,
          scheduled_date: j.scheduled_date,
          aircraft_name: j.aircraft?.nickname ?? null,
          aircraft_model: j.aircraft?.model ?? null,
        }))
      );
      setLoading(false);
    })();
  }, []);

  const filtered = jobs.filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      j.job_number.toLowerCase().includes(q) ||
      j.property_address.toLowerCase().includes(q)
    );
  });

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto my-8" />;

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search by job number or address..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ScrollArea className="h-64 border rounded-md">
        <div className="divide-y">
          {filtered.map((j) => (
            <button
              key={j.id}
              className="w-full text-left px-3 py-2 hover:bg-accent transition-colors text-sm"
              onClick={() => onSelect(j)}
            >
              <span className="font-medium">{j.job_number}</span>
              <span className="text-muted-foreground ml-2">
                {j.property_address}
              </span>
              {j.client_name && (
                <span className="text-muted-foreground ml-2">
                  ({j.client_name})
                </span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No jobs found.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
