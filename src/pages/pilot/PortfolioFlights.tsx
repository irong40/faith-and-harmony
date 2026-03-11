import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Camera, MapPin, Calendar, X } from "lucide-react";
import { format } from "date-fns";
import MissionCard from "@/components/pilot/MissionCard";

interface DronePackage {
  id: string;
  name: string;
  code: string;
}

export default function PortfolioFlights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("VA");
  const [packageId, setPackageId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch portfolio flights
  const { data: flights = [], isLoading } = useQuery({
    queryKey: ["portfolio-flights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drone_jobs")
        .select("id, job_number, property_address, property_city, scheduled_date, status, drone_packages(name, code)")
        .eq("pilot_id", user!.id)
        .eq("is_test", true)
        .neq("status", "canceled")
        .order("scheduled_date", { ascending: false });

      if (error) throw error;
      return (data || []).map((job: any) => ({
        id: job.id,
        job_number: job.job_number,
        client_name: "Portfolio Flight",
        property_address: job.property_address,
        scheduled_date: job.scheduled_date,
        status: job.status,
        package_name: job.drone_packages?.name || null,
        package_code: job.drone_packages?.code || null,
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch available packages
  const { data: packages = [] } = useQuery({
    queryKey: ["drone-packages"],
    queryFn: async (): Promise<DronePackage[]> => {
      const { data, error } = await supabase
        .from("drone_packages")
        .select("id, name, code")
        .eq("active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Create portfolio flight
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("drone_jobs")
        .insert({
          pilot_id: user!.id,
          is_test: true,
          property_address: address,
          property_city: city || null,
          property_state: state || "VA",
          package_id: packageId || null,
          scheduled_date: scheduledDate || null,
          pilot_notes: notes || null,
          status: "scheduled",
          customer_id: null,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-flights"] });
      toast({ title: "Portfolio flight created" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create flight", description: err.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setAddress("");
    setCity("");
    setState("VA");
    setPackageId("");
    setScheduledDate("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      toast({ title: "Address is required", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const activeCount = flights.filter((f) => f.status !== "complete").length;
  const completedCount = flights.filter((f) => f.status === "complete").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/pilot">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-foreground">Portfolio Flights</h1>
              <p className="text-xs text-muted-foreground">Practice flights for your portfolio</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "default"}
          >
            {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showForm ? "Cancel" : "New Flight"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Create Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">New Portfolio Flight</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="address">Property Address</Label>
                  <Input
                    id="address"
                    placeholder="123 Main St"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Norfolk"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="package">Package Type</Label>
                  <Select value={packageId} onValueChange={setPackageId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a package to practice" />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} ({pkg.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date">Scheduled Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="What are you practicing? Any specific shots or techniques?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Portfolio Flight"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Flight List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : flights.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No portfolio flights yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create one to practice your workflow and build your portfolio
            </p>
            {!showForm && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Your First Flight
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {flights.map((flight) => (
              <MissionCard
                key={flight.id}
                mission={{
                  id: flight.id,
                  client_name: "Portfolio Flight",
                  address: flight.property_address,
                  scheduled_date: flight.scheduled_date,
                  status: flight.status as "scheduled" | "captured" | "complete" | "canceled",
                  package_type: flight.package_name || undefined,
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
