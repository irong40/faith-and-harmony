import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { emitActivityEvent } from "@/components/admin/ActivityFeed";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Plane,
  FileText,
  ChevronRight,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import AdminNav from "./components/AdminNav";
import ClientAutocomplete from "@/components/admin/ClientAutocomplete";
import ClientFormDialog from "@/components/admin/ClientFormDialog";
import { jobIntakeSchema, type JobIntakeFormValues } from "@/lib/schemas";

interface ProcessingTemplate {
  id: string;
  path_code: string | null;
  display_name: string | null;
  description: string | null;
  preset_name: string;
  active: boolean | null;
}

interface Aircraft {
  id: string;
  model: string;
  nickname: string | null;
  status: string;
}

interface Pilot {
  id: string;
  full_name: string | null;
}

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
}

export default function JobIntake() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState<Client | null>(null);

  const form = useForm<JobIntakeFormValues>({
    resolver: zodResolver(jobIntakeSchema),
    defaultValues: {
      client_id: "",
      processing_template_id: "",
      site_address: "",
      scheduled_date: "",
      scheduled_time: "",
      pilot_id: "",
      aircraft_id: "",
      notes: "",
    },
  });

  // Load processing templates
  const { data: templates = [] } = useQuery<ProcessingTemplate[]>({
    queryKey: ["processing-templates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processing_templates")
        .select("id, path_code, display_name, description, preset_name, active")
        .eq("active", true)
        .order("path_code");
      if (error) throw error;
      return (data || []) as ProcessingTemplate[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Load aircraft
  const { data: aircraft = [] } = useQuery<Aircraft[]>({
    queryKey: ["aircraft-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aircraft")
        .select("id, model, nickname, status")
        .eq("status", "active")
        .order("model");
      if (error) throw error;
      return (data || []) as Aircraft[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Load pilots (users with pilot role)
  const { data: pilots = [] } = useQuery<Pilot[]>({
    queryKey: ["pilots-list"],
    queryFn: async () => {
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "pilot");
      if (roleError) throw roleError;
      const pilotIds = (roleData || []).map((r) => r.user_id);
      if (pilotIds.length === 0) return [];
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", pilotIds)
        .order("full_name");
      if (profileError) throw profileError;
      return (profileData || []) as Pilot[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const watchedClientId = form.watch("client_id");
  const watchedTemplateId = form.watch("processing_template_id");

  const selectedTemplate = templates.find((t) => t.id === watchedTemplateId);

  // Fetch client data when client_id changes
  const fetchClientData = async (clientId: string) => {
    if (!clientId) {
      setSelectedClientData(null);
      return;
    }
    const { data } = await supabase
      .from("clients")
      .select("id, name, company, email, phone")
      .eq("id", clientId)
      .single();
    setSelectedClientData(data as Client | null);
  };

  const handleClientChange = (clientId: string) => {
    form.setValue("client_id", clientId, { shouldValidate: true });
    fetchClientData(clientId);
  };

  const handleQuickAddSuccess = (newClient?: { id: string; name: string; company: string | null; email: string | null; phone: string | null }) => {
    if (newClient) {
      form.setValue("client_id", newClient.id, { shouldValidate: true });
      setSelectedClientData(newClient);
    }
  };

  const onSubmit = async (values: JobIntakeFormValues) => {
    const today = new Date().toISOString().split("T")[0];
    if (values.scheduled_date < today) {
      form.setError("scheduled_date", { message: "Must be a future date" });
      return;
    }

    const payload = {
      client_id: values.client_id,
      processing_template_id: values.processing_template_id,
      site_address: values.site_address,
      property_address: values.site_address,
      scheduled_date: values.scheduled_date,
      scheduled_time: values.scheduled_time || null,
      pilot_id: values.pilot_id || null,
      aircraft_id: values.aircraft_id || null,
      admin_notes: values.notes || null,
      status: "intake" as const,
      job_number: "",
    };

    const { data, error } = await supabase
      .from("drone_jobs")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      toast({
        title: "Error creating job",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Emit activity event (best-effort)
    await emitActivityEvent({
      event_type: "mission_created",
      entity_type: "mission",
      entity_id: data.id,
      summary: `Mission created: ${values.site_address || "Unknown address"}`,
      metadata: { pilot_id: values.pilot_id || null },
    });

    toast({ title: "Job created successfully" });
    navigate(`/admin/drone-jobs/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">New Job</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in job details to create a new mission record.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Section 1: Client */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <FormField
                  control={form.control}
                  name="client_id"
                  render={() => (
                    <FormItem>
                      <FormLabel>Select Client *</FormLabel>
                      <FormControl>
                        <ClientAutocomplete
                          value={watchedClientId}
                          onChange={handleClientChange}
                          onAddNew={() => setShowQuickAdd(true)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Client summary card */}
                {selectedClientData && (
                  <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1">
                    <p className="font-medium text-sm">{selectedClientData.name}</p>
                    {selectedClientData.company && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {selectedClientData.company}
                      </p>
                    )}
                    {selectedClientData.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedClientData.email}
                      </p>
                    )}
                    {selectedClientData.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedClientData.phone}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 2: Job Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Job Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="processing_template_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue placeholder="Select job type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <span className="flex items-center gap-2">
                                {t.path_code && (
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {t.path_code}
                                  </Badge>
                                )}
                                {t.display_name || t.preset_name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Template description */}
                {selectedTemplate?.description && (
                  <div className="rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="site_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Site Address *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234 Main St, Norfolk, VA 23510"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="scheduled_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Scheduled Date *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            min={new Date().toISOString().split("T")[0]}
                            className="min-h-[44px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="scheduled_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Time (optional)
                        </FormLabel>
                        <FormControl>
                          <Input type="time" className="min-h-[44px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes / Requirements</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Access instructions, special requirements, client expectations..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 3: Assignment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Plane className="h-4 w-4" />
                  Assignment (optional)
                </CardTitle>
                <CardDescription className="text-xs">
                  Assign a pilot and aircraft now, or do it later from the job detail page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="pilot_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Pilot</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue placeholder="Assign later" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {pilots.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.full_name || "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aircraft_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aircraft</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue placeholder="Assign later" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {aircraft.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.model}{a.nickname ? ` (${a.nickname})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-3 justify-end pb-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/drone-jobs")}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="min-h-[44px] sm:px-8"
              >
                {form.formState.isSubmitting ? "Creating..." : (
                  <span className="flex items-center gap-2">
                    Create Job
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </main>

      {/* Quick Add Client Dialog */}
      <ClientFormDialog
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        client={null}
        onSuccess={handleQuickAddSuccess}
        minimal
      />
    </div>
  );
}
