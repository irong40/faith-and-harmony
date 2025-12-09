import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BUDGET_RANGES, CONTACT_METHODS, HOW_HEARD_OPTIONS, ServiceCode } from "@/data/services";
import { ConditionalFields } from "@/components/service-request/ConditionalFields";
import type { Enums, Json } from "@/integrations/supabase/types";

interface Service {
  id: string;
  code: string;
  name: string;
}

interface ServiceRequestFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id: string;
    service_id: string | null;
    client_name: string;
    client_email: string;
    client_phone: string;
    company_name: string | null;
    preferred_contact_method: Enums<"contact_method"> | null;
    project_title: string | null;
    project_description: string;
    budget_range: string | null;
    target_start_date: string | null;
    target_end_date: string | null;
    source: string | null;
    status: Enums<"request_status"> | null;
    admin_notes: string | null;
    metadata: Json | null;
    services?: { code: string } | null;
  };
}

const STATUS_OPTIONS: { value: Enums<"request_status">; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "scoping", label: "Scoping" },
  { value: "quoted", label: "Quoted" },
  { value: "closed", label: "Closed" },
  { value: "declined", label: "Declined" },
];

export default function ServiceRequestForm({
  onSuccess,
  onCancel,
  initialData,
}: ServiceRequestFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceCode, setSelectedServiceCode] = useState<ServiceCode | null>(
    (initialData?.services?.code as ServiceCode) || null
  );
  const [metadata, setMetadata] = useState<Record<string, any>>(() => {
    const md = initialData?.metadata;
    if (md && typeof md === "object" && !Array.isArray(md)) {
      return md as Record<string, any>;
    }
    return {};
  });

  const [formData, setFormData] = useState({
    serviceId: initialData?.service_id || "",
    clientName: initialData?.client_name || "",
    clientEmail: initialData?.client_email || "",
    clientPhone: initialData?.client_phone || "",
    companyName: initialData?.company_name || "",
    preferredContactMethod: initialData?.preferred_contact_method || "email",
    projectTitle: initialData?.project_title || "",
    projectDescription: initialData?.project_description || "",
    budgetRange: initialData?.budget_range || "",
    targetStartDate: initialData?.target_start_date || "",
    targetEndDate: initialData?.target_end_date || "",
    source: initialData?.source || "",
    status: initialData?.status || "new",
    adminNotes: initialData?.admin_notes || "",
  });

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from("services")
        .select("id, code, name")
        .eq("active", true)
        .order("name");
      if (data) setServices(data);
    };
    fetchServices();
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleServiceChange = (serviceId: string) => {
    handleInputChange("serviceId", serviceId);
    const service = services.find((s) => s.id === serviceId);
    setSelectedServiceCode((service?.code as ServiceCode) || null);
    setMetadata({});
  };

  const handleMetadataChange = (key: string, value: any) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.clientEmail || !formData.clientPhone) {
      toast({ title: "Please fill in required client fields", variant: "destructive" });
      return;
    }

    if (!formData.projectDescription) {
      toast({ title: "Please provide a project description", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        service_id: formData.serviceId || null,
        client_name: formData.clientName,
        client_email: formData.clientEmail,
        client_phone: formData.clientPhone,
        company_name: formData.companyName || null,
        preferred_contact_method: formData.preferredContactMethod as Enums<"contact_method">,
        project_title: formData.projectTitle || null,
        project_description: formData.projectDescription,
        budget_range: formData.budgetRange || null,
        target_start_date: formData.targetStartDate || null,
        target_end_date: formData.targetEndDate || null,
        source: formData.source || null,
        status: formData.status as Enums<"request_status">,
        admin_notes: formData.adminNotes || null,
        metadata,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from("service_requests")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
        toast({ title: "Service request updated" });
      } else {
        const { error } = await supabase.from("service_requests").insert(payload);
        if (error) throw error;
        toast({ title: "Service request created" });
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error saving request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Service & Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Service</Label>
          <Select value={formData.serviceId} onValueChange={handleServiceChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a service" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => handleInputChange("status", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Client Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Client Information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name *</Label>
            <Input
              value={formData.clientName}
              onChange={(e) => handleInputChange("clientName", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Company</Label>
            <Input
              value={formData.companyName}
              onChange={(e) => handleInputChange("companyName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.clientEmail}
              onChange={(e) => handleInputChange("clientEmail", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Phone *</Label>
            <Input
              type="tel"
              value={formData.clientPhone}
              onChange={(e) => handleInputChange("clientPhone", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Preferred Contact</Label>
            <Select
              value={formData.preferredContactMethod}
              onValueChange={(v) => handleInputChange("preferredContactMethod", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={formData.source}
              onValueChange={(v) => handleInputChange("source", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="How did they hear about us?" />
              </SelectTrigger>
              <SelectContent>
                {HOW_HEARD_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Project Details</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project Title</Label>
            <Input
              value={formData.projectTitle}
              onChange={(e) => handleInputChange("projectTitle", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Project Description *</Label>
            <Textarea
              value={formData.projectDescription}
              onChange={(e) => handleInputChange("projectDescription", e.target.value)}
              rows={4}
              required
            />
          </div>
        </div>
      </div>

      {/* Conditional Fields based on service */}
      {selectedServiceCode && (
        <ConditionalFields
          serviceCode={selectedServiceCode}
          metadata={metadata}
          onMetadataChange={handleMetadataChange}
        />
      )}

      {/* Timeline & Budget */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Timeline & Budget</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Target Start</Label>
            <Input
              type="date"
              value={formData.targetStartDate}
              onChange={(e) => handleInputChange("targetStartDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Target End</Label>
            <Input
              type="date"
              value={formData.targetEndDate}
              onChange={(e) => handleInputChange("targetEndDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Budget Range</Label>
            <Select
              value={formData.budgetRange}
              onValueChange={(v) => handleInputChange("budgetRange", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent>
                {BUDGET_RANGES.map((range) => (
                  <SelectItem key={range} value={range}>
                    {range}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Admin Notes */}
      <div className="space-y-2">
        <Label>Admin Notes (internal)</Label>
        <Textarea
          value={formData.adminNotes}
          onChange={(e) => handleInputChange("adminNotes", e.target.value)}
          rows={3}
          placeholder="Internal notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update Request" : "Create Request"}
        </Button>
      </div>
    </form>
  );
}
