import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AdminNav from "./components/AdminNav";
import { ReportSectionNav } from "./components/ReportSectionNav";
import { ReportJobSelector, type DroneJobOption } from "./components/ReportJobSelector";
import { ReportSection } from "@/components/reports/ReportSection";
import { ReportPreview } from "@/components/reports/ReportPreview";
import ReportPrintView from "@/components/reports/ReportPrintView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  FileDown,
} from "lucide-react";
import {
  useReportTemplates,
  useReportTemplate,
  useJobReport,
  useCreateReport,
  useUpdateReport,
  useGenerateReportPDF,
} from "@/hooks/useReportBuilder";
import type {
  ReportSectionKey,
  SectionDataMap,
  SectionManifestEntry,
  ReportImage,
  WeatherData,
} from "@/types/report";

/** Pull the cached NWS forecast row closest to midday local (16:00 UTC) on the
 * flight date. Returns null when the cache has no rows for that date. */
async function fetchWeatherPrefill(dateStr: string): Promise<WeatherData | null> {
  const { data, error } = await supabase
    .from("weather_forecast_cache")
    .select(
      "forecast_hour, temperature_c, wind_speed_ms, wind_gust_ms, visibility_sm, sky_cover_pct, precipitation_probability"
    )
    .gte("forecast_hour", `${dateStr}T00:00:00Z`)
    .lt("forecast_hour", `${dateStr}T23:59:59Z`)
    .order("forecast_hour");
  if (error || !data?.length) return null;

  const midday = new Date(`${dateStr}T16:00:00Z`).getTime();
  const row = data.reduce((best, r) =>
    Math.abs(new Date(r.forecast_hour).getTime() - midday) <
    Math.abs(new Date(best.forecast_hour).getTime() - midday)
      ? r
      : best
  );

  const skyCover = (pct: number | null): string | undefined => {
    if (pct == null) return undefined;
    if (pct <= 10) return "Clear";
    if (pct <= 25) return "Few clouds";
    if (pct <= 50) return "Scattered";
    if (pct <= 87) return "Broken";
    return "Overcast";
  };

  return {
    temperature_f:
      row.temperature_c != null ? Math.round((row.temperature_c * 9) / 5 + 32) : undefined,
    wind_speed_mph:
      row.wind_speed_ms != null ? Math.round(row.wind_speed_ms * 2.23694) : undefined,
    wind_gusts_mph:
      row.wind_gust_ms != null ? Math.round(row.wind_gust_ms * 2.23694) : undefined,
    cloud_cover: skyCover(row.sky_cover_pct),
    visibility: row.visibility_sm != null ? `${row.visibility_sm} SM` : undefined,
    precipitation:
      row.precipitation_probability != null
        ? `${row.precipitation_probability}% chance`
        : undefined,
    station: "NWS forecast (cached)",
    notes: `Prefilled from cached NWS forecast for ${dateStr}; verify against actual flight conditions.`,
  };
}

export default function ReportBuilder() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // report state
  const [reportId, setReportId] = useState<string | undefined>(id);
  const [title, setTitle] = useState("Untitled Report");
  const [sectionData, setSectionData] = useState<Partial<SectionDataMap>>({});
  const [activeSections, setActiveSections] = useState<ReportSectionKey[]>([]);
  const [selectedSection, setSelectedSection] = useState<ReportSectionKey | null>(null);
  const [images, setImages] = useState<ReportImage[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  // wizard state (new report)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedJob, setSelectedJob] = useState<DroneJobOption | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(
    searchParams.get("template_id") ?? undefined
  );

  // hooks
  const { data: templates } = useReportTemplates();
  const { data: template } = useReportTemplate(selectedTemplateId);
  const { data: existingReport, isLoading: reportLoading } = useJobReport(isEditMode ? id : undefined);
  const createMutation = useCreateReport();
  const updateMutation = useUpdateReport();
  const pdfMutation = useGenerateReportPDF();
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = useCallback(async () => {
    if (!reportId) return;
    // Log generation to edge function (tracking)
    pdfMutation.mutate(reportId);
    // Trigger browser print dialog for actual PDF
    setTimeout(() => window.print(), 300);
  }, [reportId, pdfMutation]);

  const manifest: SectionManifestEntry[] = useMemo(
    () => template?.sections_manifest ?? [],
    [template]
  );

  // Load existing report
  useEffect(() => {
    if (!existingReport) return;
    setReportId(existingReport.id);
    setTitle(existingReport.title);
    setSectionData(existingReport.section_data);
    setActiveSections(existingReport.active_sections);
    setImages(existingReport.report_images ?? []);
    setSelectedTemplateId(existingReport.template_id);
    if (existingReport.active_sections.length > 0) {
      setSelectedSection(existingReport.active_sections[0]);
    }
    setStep(3);
  }, [existingReport]);

  // pre-select job from query param
  useEffect(() => {
    const jobIdParam = searchParams.get("job_id");
    if (jobIdParam && !isEditMode) {
      (async () => {
        const { data } = await supabase
          .from("drone_jobs")
          .select("id, job_number, property_address, property_type, client_id, scheduled_date, clients(name, company), aircraft:aircraft_id(name, model)")
          .eq("id", jobIdParam)
          .single();
        if (data) {
          setSelectedJob({
            id: data.id,
            job_number: data.job_number,
            property_address: data.property_address,
            property_type: data.property_type,
            client_id: data.client_id,
            client_name: (data as any).clients?.name ?? null,
            client_company: (data as any).clients?.company ?? null,
            scheduled_date: data.scheduled_date,
            aircraft_name: (data as any).aircraft?.name ?? null,
            aircraft_model: (data as any).aircraft?.model ?? null,
          });
          setStep(2);
        }
      })();
    }
  }, [searchParams, isEditMode]);

  // Auto-populate from job data
  const buildInitialSectionData = useCallback(
    (job: DroneJobOption): Partial<SectionDataMap> => ({
      cover_page: {
        title: `Inspection Report - ${job.property_address}`,
        client_name: job.client_name ?? "",
        client_company: job.client_company ?? undefined,
        property_address: job.property_address,
        report_date: new Date().toISOString().slice(0, 10),
        job_number: job.job_number,
        pilot_name: "Adam Pierce",
        prepared_by: "Adam Pierce",
        classification: "CONFIDENTIAL",
      },
      equipment: {
        aircraft_name: job.aircraft_name ?? "",
        aircraft_model: job.aircraft_model ?? undefined,
      },
      flight_data: {
        flights: [{ flight_number: 1, date: job.scheduled_date ?? new Date().toISOString().slice(0, 10) }],
      },
      weather_conditions: {},
    }),
    []
  );

  const handleCreate = async () => {
    if (!selectedJob || !selectedTemplateId || !template) return;
    const initial = buildInitialSectionData(selectedJob);
    if (selectedJob.scheduled_date) {
      const weather = await fetchWeatherPrefill(selectedJob.scheduled_date);
      if (weather) initial.weather_conditions = weather;
    }
    const sections = template.sections_manifest.filter((e) => e.required).map((e) => e.key);
    try {
      const newId = await createMutation.mutateAsync({
        title: `Report - ${selectedJob.job_number}`,
        template_id: selectedTemplateId,
        job_id: selectedJob.id,
        client_id: selectedJob.client_id ?? undefined,
        section_data: initial,
        active_sections: sections,
        prepared_by: "Adam Pierce",
      });
      navigate(`/admin/reports/${newId}/edit`, { replace: true });
    } catch {
      // error handled by mutation
    }
  };

  // Debounced auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const triggerSave = useCallback(
    (data: Partial<SectionDataMap>, sections: ReportSectionKey[], reportTitle: string) => {
      if (!reportId) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        updateMutation.mutate({ id: reportId, section_data: data, active_sections: sections, title: reportTitle });
      }, 500);
    },
    [reportId, updateMutation]
  );

  const handleSectionDataChange = useCallback(
    <K extends ReportSectionKey>(key: K, value: SectionDataMap[K]) => {
      setSectionData((prev) => {
        const next = { ...prev, [key]: value };
        triggerSave(next, activeSections, title);
        return next;
      });
    },
    [activeSections, title, triggerSave]
  );

  const handleToggleSection = useCallback(
    (key: ReportSectionKey) => {
      setActiveSections((prev) => {
        const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
        triggerSave(sectionData, next, title);
        return next;
      });
    },
    [sectionData, title, triggerSave]
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      triggerSave(sectionData, activeSections, newTitle);
    },
    [sectionData, activeSections, triggerSave]
  );

  const handleFinalize = () => {
    if (!reportId) return;
    updateMutation.mutate(
      { id: reportId, status: "final" },
      { onSuccess: () => toast.success("Report finalized") }
    );
  };

  // ---- Wizard (new report) ----
  if (!isEditMode && step < 3) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate("/admin/reports")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Reports
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>{step === 1 ? "Step 1: Select Job" : "Step 2: Select Template"}</CardTitle>
            </CardHeader>
            <CardContent>
              {step === 1 && <ReportJobSelector onSelect={(job) => { setSelectedJob(job); setStep(2); }} />}
              {step === 2 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Selected job: <strong>{selectedJob?.job_number}</strong> &mdash; {selectedJob?.property_address}
                  </p>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger><SelectValue placeholder="Choose a report template..." /></SelectTrigger>
                    <SelectContent>
                      {(templates ?? []).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.service_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                    <Button disabled={!selectedTemplateId || createMutation.isPending} onClick={handleCreate}>
                      {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Report
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ---- Loading ----
  if (isEditMode && reportLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // ---- 3-column editor ----
  const currentData = selectedSection ? sectionData[selectedSection] : undefined;
  const currentImages = selectedSection ? images.filter((i) => i.section_key === selectedSection) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AdminNav />
      {/* Top bar */}
      <div className="border-b bg-card px-4 py-2 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/reports")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="max-w-md font-semibold border-none bg-transparent focus-visible:ring-1"
        />
        <Badge
          variant="outline"
          className={existingReport?.status === "final" ? "bg-green-600 text-white border-green-600" : "border-yellow-500 text-yellow-700"}
        >
          {existingReport?.status ?? "draft"}
        </Badge>
        <div className="flex-1" />
        {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Button variant="outline" size="sm" onClick={() => {
          if (!reportId) return;
          updateMutation.mutate({ id: reportId, section_data: sectionData, active_sections: activeSections, title }, { onSuccess: () => toast.success("Saved") });
        }}>
          <Save className="h-4 w-4 mr-1" /> Save
        </Button>
        <Button size="sm" onClick={handleFinalize}>
          <CheckCircle className="h-4 w-4 mr-1" /> Finalize
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowPreview((v) => !v)} title={showPreview ? "Hide preview" : "Show preview"}>
          {showPreview ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT sidebar */}
        <aside className="w-64 shrink-0 border-r bg-card p-3 hidden lg:block">
          <h3 className="font-semibold text-sm mb-3">Sections</h3>
          <ReportSectionNav
            manifest={manifest}
            activeSections={activeSections}
            selectedSection={selectedSection}
            sectionData={sectionData}
            onToggle={handleToggleSection}
            onSelect={setSelectedSection}
          />
        </aside>

        {/* CENTER editor */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="lg:hidden mb-4">
            <Select value={selectedSection ?? ""} onValueChange={(v) => setSelectedSection(v as ReportSectionKey)}>
              <SelectTrigger><SelectValue placeholder="Select a section..." /></SelectTrigger>
              <SelectContent>
                {manifest.filter((e) => activeSections.includes(e.key)).map((e) => (
                  <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedSection ? (
            <ReportSection
              sectionKey={selectedSection}
              data={(currentData ?? {}) as SectionDataMap[typeof selectedSection]}
              onChange={(val) => handleSectionDataChange(selectedSection, val)}
              mode="edit"
              images={currentImages}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
              <p className="text-lg font-medium">Select a section to begin editing</p>
              <p className="text-sm mt-1">Choose a section from the sidebar on the left.</p>
            </div>
          )}
        </main>

        {/* RIGHT preview */}
        {showPreview && (
          <aside className="w-96 shrink-0 border-l bg-muted/30 hidden xl:block">
            <div className="p-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">Preview</h3>
              <Button variant="outline" size="sm" disabled={pdfMutation.isPending} onClick={handleDownloadPDF}>
                {pdfMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
                Download PDF
              </Button>
            </div>
            <ReportPreview activeSections={activeSections} sectionData={sectionData} manifest={manifest} images={images} />
          </aside>
        )}
      </div>

      {/* Hidden print view — only visible during window.print() */}
      {template && reportId && (
        <div className="hidden print:block">
          <ReportPrintView
            ref={printRef}
            report={{
              id: reportId,
              job_id: selectedJob?.id,
              template_id: selectedTemplateId || "",
              status: "draft",
              title,
              section_data: sectionData,
              active_sections: activeSections,
              report_date: new Date().toISOString().split("T")[0],
              prepared_by: "Adam Pierce, Founder",
              classification: "CLIENT CONFIDENTIAL",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }}
            template={template}
            images={images}
          />
        </div>
      )}
    </div>
  );
}
