import { useSearchParams } from "react-router-dom";
import { CalendarDays, Cloud } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageShell from "@/components/admin/PageShell";
import { SchedulingPanel } from "./Scheduling";
import { WeatherOperationsPanel } from "./WeatherOperations";

// ---------------------------------------------------------------------------
// CalendarOps — /admin/calendar.
//
// Availability and weather were two separate pages answering one question:
// "can we fly on this day?". A pilot checking a slot had to leave the page to
// find out whether the sky agreed. They are tabs of one view now.
//
// The tab is a URL parameter, not component state, because /admin/weather is a
// permanent redirect to /admin/calendar?tab=weather.
// ---------------------------------------------------------------------------

export const CALENDAR_TABS = ["schedule", "weather"] as const;
export type CalendarTab = (typeof CALENDAR_TABS)[number];

export function resolveCalendarTab(raw: string | null): CalendarTab {
  return raw === "weather" ? "weather" : "schedule";
}

export default function CalendarOps() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = resolveCalendarTab(searchParams.get("tab"));

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "schedule") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <PageShell
      title="Calendar"
      description={
        tab === "weather"
          ? "Forecast and weather holds across scheduled missions"
          : "Availability calendar, weekly slots and blackout dates"
      }
      icon={tab === "weather" ? Cloud : CalendarDays}
      width="wide"
    >
      {/* Radix unmounts the inactive TabsContent, so only the visible panel
          runs its queries — switching tabs is what fetches the forecast. */}
      <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="weather" className="gap-2">
            <Cloud className="h-4 w-4" />
            Weather
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <SchedulingPanel />
        </TabsContent>

        <TabsContent value="weather">
          <WeatherOperationsPanel />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
