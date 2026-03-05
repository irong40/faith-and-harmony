import { useState, useMemo } from "react";
import AdminNav from "./components/AdminNav";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Loader2, Trash2 } from "lucide-react";
import {
  useAvailabilitySlots,
  useBlackoutDates,
  useAvailabilityOverrides,
  useAddBlackoutDate,
  useRemoveBlackoutDate,
  useToggleSlot,
} from "@/hooks/useAvailability";
import type { BlackoutDate } from "@/hooks/useAvailability";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const REASON_OPTIONS = [
  { value: "weather_hold", label: "Weather Hold" },
  { value: "holiday", label: "Holiday" },
  { value: "maintenance", label: "Maintenance" },
  { value: "personal", label: "Personal" },
];

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromIso(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

export default function Scheduling() {
  const today = new Date();
  const rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const rangeEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const startStr = toIso(rangeStart);
  const endStr = toIso(rangeEnd);

  const { data: slots, isLoading: slotsLoading } = useAvailabilitySlots();
  const { data: blackouts, isLoading: blackoutsLoading } = useBlackoutDates(startStr, endStr);
  const { data: overrides } = useAvailabilityOverrides(startStr, endStr);

  const addBlackout = useAddBlackoutDate();
  const removeBlackout = useRemoveBlackoutDate();
  const toggleSlot = useToggleSlot();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("weather_hold");
  const [customReason, setCustomReason] = useState("");

  const activeDays = useMemo(() => {
    if (!slots) return new Set<number>();
    return new Set(slots.filter((s) => s.is_active).map((s) => s.day_of_week));
  }, [slots]);

  const blackoutSet = useMemo(() => {
    if (!blackouts) return new Map<string, BlackoutDate>();
    const m = new Map<string, BlackoutDate>();
    for (const b of blackouts) m.set(b.blackout_date, b);
    return m;
  }, [blackouts]);

  const overrideMap = useMemo(() => {
    if (!overrides) return new Map<string, boolean>();
    const m = new Map<string, boolean>();
    for (const o of overrides) m.set(o.override_date, o.is_available);
    return m;
  }, [overrides]);

  // Build modifier date arrays for the calendar
  const { availableDates, blackoutDates, overrideOnDates, overrideOffDates } = useMemo(() => {
    const available: Date[] = [];
    const blocked: Date[] = [];
    const overOn: Date[] = [];
    const overOff: Date[] = [];

    const cursor = new Date(rangeStart);
    while (cursor <= rangeEnd) {
      const iso = toIso(cursor);
      const dow = cursor.getDay();

      if (blackoutSet.has(iso)) {
        blocked.push(fromIso(iso));
      } else if (overrideMap.has(iso)) {
        if (overrideMap.get(iso)) {
          overOn.push(fromIso(iso));
        } else {
          overOff.push(fromIso(iso));
        }
      } else if (activeDays.has(dow)) {
        available.push(fromIso(iso));
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      availableDates: available,
      blackoutDates: blocked,
      overrideOnDates: overOn,
      overrideOffDates: overOff,
    };
  }, [activeDays, blackoutSet, overrideMap, rangeStart, rangeEnd]);

  function handleDayClick(date: Date | undefined) {
    if (!date) return;
    setSelectedDate(date);
    setReason("weather_hold");
    setCustomReason("");
    setDialogOpen(true);
  }

  const selectedIso = selectedDate ? toIso(selectedDate) : "";
  const selectedBlackout = blackoutSet.get(selectedIso);
  const isPast = selectedDate ? selectedDate < new Date(toIso(today) + "T00:00:00") : false;

  function handleAddBlackout() {
    const finalReason = reason === "custom" ? customReason.trim() : reason;
    if (!finalReason || !selectedIso) return;
    addBlackout.mutate(
      { blackout_date: selectedIso, reason: finalReason },
      { onSuccess: () => setDialogOpen(false) },
    );
  }

  function handleRemoveBlackout() {
    if (!selectedBlackout) return;
    removeBlackout.mutate(selectedBlackout.id, {
      onSuccess: () => setDialogOpen(false),
    });
  }

  const isLoading = slotsLoading || blackoutsLoading;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Scheduling</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="calendar">
            <TabsList className="mb-4">
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="slots">Weekly Slots</TabsTrigger>
            </TabsList>

            <TabsContent value="calendar">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Availability Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDayClick}
                      numberOfMonths={2}
                      disabled={(date) => date < new Date(toIso(today) + "T00:00:00")}
                      modifiers={{
                        available: availableDates,
                        blackout: blackoutDates,
                        overrideOn: overrideOnDates,
                        overrideOff: overrideOffDates,
                      }}
                      modifiersClassNames={{
                        available: "bg-green-100 text-green-800 rounded-md",
                        blackout: "bg-red-100 text-red-600 line-through rounded-md",
                        overrideOn: "bg-blue-100 text-blue-700 rounded-md",
                        overrideOff: "bg-orange-100 text-orange-700 rounded-md",
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                      Available
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
                      Blocked
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                      Extra Open
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-orange-100 border border-orange-300" />
                      Override Closed
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="slots">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Weekly Defaults</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {DAY_NAMES.map((name, dow) => {
                      const slot = slots?.find((s) => s.day_of_week === dow);
                      return (
                        <div
                          key={dow}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div>
                            <span className="font-medium">{name}</span>
                            {slot ? (
                              <span className="text-sm text-muted-foreground ml-3">
                                {slot.start_time.slice(0, 5)} to {slot.end_time.slice(0, 5)}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground ml-3">
                                No slot configured
                              </span>
                            )}
                          </div>
                          <Switch
                            checked={slot?.is_active ?? false}
                            disabled={!slot || toggleSlot.isPending}
                            onCheckedChange={(checked) => {
                              if (slot) {
                                toggleSlot.mutate({ id: slot.id, is_active: checked });
                              }
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDate
                ? selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </DialogTitle>
          </DialogHeader>

          {isPast ? (
            <p className="text-sm text-muted-foreground">Past dates cannot be modified.</p>
          ) : selectedBlackout ? (
            <div className="space-y-4">
              <p className="text-sm">
                This date is blocked. Reason: <strong>{selectedBlackout.reason}</strong>
              </p>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={handleRemoveBlackout}
                  disabled={removeBlackout.isPending}
                >
                  {removeBlackout.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Remove Blackout
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {reason === "custom" && (
                  <Input
                    placeholder="Enter reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                  />
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddBlackout}
                  disabled={
                    addBlackout.isPending ||
                    (reason === "custom" && !customReason.trim())
                  }
                >
                  {addBlackout.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Block Date
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
