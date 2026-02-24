import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw, Edit, Route } from "lucide-react";
import AdminNav from "./components/AdminNav";

interface ProcessingTemplate {
  id: string;
  path_code: string | null;
  display_name: string | null;
  description: string | null;
  preset_name: string;
  output_format: string | null;
  qa_threshold: number | null;
  adiat_enabled: boolean | null;
  raw_workflow: boolean | null;
  active: boolean | null;
  default_steps: unknown;
  package_id: string | null;
}

const PATH_COLORS: Record<string, string> = {
  A: "bg-blue-500",
  B: "bg-amber-500",
  C: "bg-green-500",
  D: "bg-purple-500",
  V: "bg-red-500",
  "B+C": "bg-teal-500",
};

export default function ProcessingTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<ProcessingTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    display_name: "",
    description: "",
    path_code: "",
    is_active: true,
    qa_threshold: "",
  });

  const { data: templates = [], isLoading, refetch } = useQuery<ProcessingTemplate[]>({
    queryKey: ["processing-templates-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processing_templates")
        .select(
          "id, path_code, display_name, description, preset_name, output_format, qa_threshold, adiat_enabled, raw_workflow, active, default_steps, package_id"
        )
        .order("path_code");
      if (error) throw error;
      return (data || []) as ProcessingTemplate[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const openEdit = (template: ProcessingTemplate) => {
    setEditingTemplate(template);
    setEditForm({
      display_name: template.display_name || "",
      description: template.description || "",
      path_code: template.path_code || "",
      is_active: template.active ?? true,
      qa_threshold: template.qa_threshold?.toString() || "",
    });
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    setSaving(true);

    const { error } = await supabase
      .from("processing_templates")
      .update({
        display_name: editForm.display_name || null,
        description: editForm.description || null,
        path_code: editForm.path_code || null,
        active: editForm.is_active,
        qa_threshold: editForm.qa_threshold ? parseInt(editForm.qa_threshold) : null,
      })
      .eq("id", editingTemplate.id);

    if (error) {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Template updated" });
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["processing-templates-admin"] });
      queryClient.invalidateQueries({ queryKey: ["processing-templates-active"] });
      refetch();
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Route className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Processing Templates</h1>
              <p className="text-sm text-muted-foreground">
                Configure pipeline paths for each job type
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`relative ${!template.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {template.path_code && (
                        <Badge
                          className={`${
                            PATH_COLORS[template.path_code] || "bg-gray-500"
                          } text-white font-mono`}
                        >
                          {template.path_code}
                        </Badge>
                      )}
                      <CardTitle className="text-base">
                        {template.display_name || template.preset_name}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(template)}
                      className="shrink-0 h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  {template.description && (
                    <CardDescription className="text-xs mt-1 line-clamp-2">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {template.output_format && (
                      <p>Output: {template.output_format}</p>
                    )}
                    {template.qa_threshold !== null && (
                      <p>QA threshold: {template.qa_threshold}%</p>
                    )}
                    {template.adiat_enabled && (
                      <p className="text-purple-600">ADIAT enabled</p>
                    )}
                    {template.raw_workflow && (
                      <p className="text-blue-600">RAW workflow</p>
                    )}
                    {Array.isArray(template.default_steps) && (template.default_steps as unknown[]).length > 0 && (
                      <p>{(template.default_steps as unknown[]).length} pipeline steps</p>
                    )}
                  </div>
                  <div className="mt-3">
                    <Badge
                      variant={template.active ? "default" : "secondary"}
                      className={template.active ? "bg-green-500 text-white" : ""}
                    >
                      {template.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Edit Template: {editingTemplate?.display_name || editingTemplate?.preset_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                placeholder="e.g. RE Photos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="path_code">Path Code</Label>
              <Input
                id="path_code"
                value={editForm.path_code}
                onChange={(e) => setEditForm({ ...editForm, path_code: e.target.value })}
                placeholder="e.g. A, B, C, D, V, B+C"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                placeholder="Describe what this processing path does..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa_threshold">QA Threshold (%)</Label>
              <Input
                id="qa_threshold"
                type="number"
                min={0}
                max={100}
                value={editForm.qa_threshold}
                onChange={(e) => setEditForm({ ...editForm, qa_threshold: e.target.value })}
                placeholder="e.g. 65"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="is_active"
                checked={editForm.is_active}
                onCheckedChange={(checked) =>
                  setEditForm({ ...editForm, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
