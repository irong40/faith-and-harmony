import { useEffect, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
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
  DollarSign,
  Navigation,
  AlertTriangle,
} from "lucide-react";
import PageShell from "@/components/admin/PageShell";
import ClientAutocomplete from "@/components/admin/ClientAutocomplete";
import ClientFormDialog from "@/components/admin/ClientFormDialog";
import PlacesAutocompleteInput from "@/components/map/PlacesAutocompleteInput";
import { jobIntakeSchema, parseJobPrice, type JobIntakeFormValues } from "@/lib/schemas";
import { describePlaceSelection, type PlaceSelection } from "@/lib/places";
import {
  DEFAULT_PROPERTY_TYPE,
  PROPERTY_TYPES,
  PROPERTY_TYPE_DESCRIPTIONS,
  PROPERTY_TYPE_LABELS,
  hasPropertyTypeMapping,
  propertyTypeForPreset,
} from "@/lib/property-type";

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
  // Once an admin picks a property_type by hand we stop re-deriving it from the
  // job type, otherwise changing the template would silently undo their choice.
  const propertyTypeOverridden = useRef(false);

  const form = useForm<JobIntakeFormValues>({
    resolver: zodResolver(jobIntakeSchema),
    defaultValues: {
      client_id: "",
      processing_template_id: "",
      site_address: "",
      latitude: null,
      longitude: null,
      property_city: null,
      property_state: null,
      property_zip: null,
      property_type: DEFAULT_PROPERTY_TYPE,
      job_price: "",
      is_rush: false,
      video_addon: false,
      vegetation_analysis: false,
      deliver_flight_tracks: true,
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
  const watchedLatitude = form.watch("latitude");
  const watchedLongitude = form.watch("longitude");
  const watchedCity = form.watch("property_city");
  const watchedState = form.watch("property_state");
  const watchedZip = form.watch("property_zip");

  const selectedTemplate = templates.find((t) => t.id === watchedTemplateId);
  const derivedPropertyType = propertyTypeForPreset(selectedTemplate?.preset_name);
  const presetIsMapped = hasPropertyTypeMapping(selectedTemplate?.preset_name);

  // property_type is NOT NULL DEFAULT 'residential' at the DB level, which is
  // why every mining/corridor/public-safety job used to land as residential.
  // Deriving it from the template's preset makes the common case correct
  // without taking the choice away from the admin.
  useEffect(() => {
    if (!selectedTemplate || propertyTypeOverridden.current) return;
    form.setValue("property_type", propertyTypeForPreset(selectedTemplate.preset_name), {
      shouldValidate: true,
    });
  }, [selectedTemplate, form]);

  const geocoded = watchedLatitude !== null && watchedLongitude !== null;
  const geocodeSummary = describePlaceSelection({
    address: "",
    latitude: watchedLatitude ?? null,
    longitude: watchedLongitude ?? null,
    city: watchedCity ?? null,
    state: watchedState ?? null,
    zip: watchedZip ?? null,
  });

  /** A hand-typed address can no longer be trusted to match stored coordinates. */
  const clearGeocodedFields = () => {
    form.setValue("latitude", null);
    form.setValue("longitude", null);
    form.setValue("property_city", null);
    form.setValue("property_state", null);
    form.setValue("property_zip", null);
  };

  const applyPlaceSelection = (selection: PlaceSelection) => {
    form.setValue("site_address", selection.address, { shouldValidate: true });
    form.setValue("latitude", selection.latitude);
    form.setValue("longitude", selection.longitude);
    form.setValue("property_city", selection.city);
    form.setValue("property_state", selection.state);
    form.setValue("property_zip", selection.zip);
  };

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
      // Geocoded fields — null unless a Places suggestion was picked.
      latitude: values.latitude,
      longitude: values.longitude,
      property_city: values.property_city,
      property_state: values.property_state,
      property_zip: values.property_zip,
      property_type: values.property_type,
      // Plain dollars. Null means the M2 billing trigger skips this job.
      job_price: parseJobPrice(values.job_price),
      is_rush: values.is_rush,
      video_addon: values.video_addon,
      vegetation_analysis: values.vegetation_analysis,
      deliver_flight_tracks: values.deliver_flight_tracks,
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
    navigate(`/admin/missions/${data.id}`);
  };

  return (
    <PageShell
      title="New Mission"
      description="Fill in the details to create a mission record."
      icon={Plane}
      breadcrumbs={[{ label: "Missions", href: "/admin/missions" }, { label: "New" }]}
      width="narrow"
    >
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
                        <PlacesAutocompleteInput
                          name={field.name}
                          value={field.value}
                          placeholder="Start typing an address, then pick a suggestion"
                          onBlur={field.onBlur}
                          onChange={(next) => {
                            field.onChange(next);
                            // Typed by hand: any coordinates we hold belong to a
                            // different address, so drop them.
                            clearGeocodedFields();
                          }}
                          onPlaceSelect={applyPlaceSelection}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {geocoded ? (
                          <span className="flex items-center gap-1 text-foreground">
                            <Navigation className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>Located: {geocodeSummary}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>
                              No coordinates yet. Pick a suggestion to enable weather holds,
                              the nearest station lookup and airspace checks.
                            </span>
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="property_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Property Type *
                        {!propertyTypeOverridden.current && presetIsMapped && (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            from job type
                          </Badge>
                        )}
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(next) => {
                          propertyTypeOverridden.current = true;
                          field.onChange(next);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue placeholder="Select property type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PROPERTY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              <span className="flex flex-col text-left">
                                <span>{PROPERTY_TYPE_LABELS[type]}</span>
                                <span className="text-xs text-muted-foreground">
                                  {PROPERTY_TYPE_DESCRIPTIONS[type]}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        {selectedTemplate
                          ? `Suggested for ${selectedTemplate.display_name || selectedTemplate.preset_name}: ${PROPERTY_TYPE_LABELS[derivedPropertyType]}. Change it if the site says otherwise.`
                          : "Drives the shot list and reporting. Pick a job type to get a suggestion."}
                      </FormDescription>
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

            {/* Section 3: Pricing & add-ons */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" />
                  Pricing &amp; Add-ons
                </CardTitle>
                <CardDescription className="text-xs">
                  Price is what billing keys off. Leave it blank only if the job is genuinely
                  unpriced.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="job_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Price</FormLabel>
                      {/* FormControl must wrap the input itself, not a layout
                          div, or the generated id lands on the div and the
                          label stops pointing at anything. */}
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          aria-hidden="true"
                        >
                          $
                        </span>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="450"
                            className="min-h-[44px] pl-7"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                      </div>
                      <FormDescription className="text-xs">
                        Whole dollars, no cents. Blank leaves the job unbilled.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-medium">Options</legend>

                  {(
                    [
                      {
                        name: "is_rush" as const,
                        label: "Rush job",
                        description: "Priority scheduling and turnaround.",
                      },
                      {
                        name: "video_addon" as const,
                        label: "Video add-on",
                        description: "Cinematic video deliverable in addition to stills.",
                      },
                      {
                        name: "vegetation_analysis" as const,
                        label: "Vegetation analysis",
                        description: "Runs the VARI / vegetation index pass on the ortho.",
                      },
                      {
                        name: "deliver_flight_tracks" as const,
                        label: "Deliver flight tracks",
                        description:
                          "Ships flight_tracks.geojson and mission.kml with the GIS bundle. " +
                          "Photo points always ship. Uncheck for corrections, classified, or any " +
                          "site where the approach path and altitudes are sensitive.",
                      },
                    ]
                  ).map((option) => (
                    <FormField
                      key={option.name}
                      control={form.control}
                      name={option.name}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start gap-3 rounded-md border border-border p-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-0.5 leading-tight">
                            <FormLabel className="cursor-pointer text-sm font-medium">
                              {option.label}
                            </FormLabel>
                            <FormDescription className="text-xs">
                              {option.description}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </fieldset>
              </CardContent>
            </Card>

            {/* Section 4: Assignment */}
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
                      <Select onValueChange={v => field.onChange(v === "unassigned" ? "" : v)} value={field.value || "unassigned"}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue placeholder="Assign later" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
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
                      <Select onValueChange={v => field.onChange(v === "unassigned" ? "" : v)} value={field.value || "unassigned"}>
                        <FormControl>
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue placeholder="Assign later" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
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
                onClick={() => navigate("/admin/missions")}
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

      {/* Quick Add Client Dialog */}
      <ClientFormDialog
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        client={null}
        onSuccess={handleQuickAddSuccess}
        minimal
      />
    </PageShell>
  );
}
