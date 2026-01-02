import { useState } from "react";
import AdminNav from "./components/AdminNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileOutput, 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Clock, 
  Search,
  Loader2,
  FileType,
  Play
} from "lucide-react";
import { 
  useDocumentTemplates, 
  useDocumentHistory, 
  useGenerateDocument,
  DocumentTemplate 
} from "@/hooks/useDocumentGenerator";
import { formatDistanceToNow } from "date-fns";

const formatIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  xlsx: FileSpreadsheet,
  docx: FileType,
  csv: FileSpreadsheet,
};

const categoryColors: Record<string, string> = {
  financial: "bg-green-100 text-green-800",
  compliance: "bg-purple-100 text-purple-800",
  inventory: "bg-blue-100 text-blue-800",
  sales: "bg-orange-100 text-orange-800",
  drone: "bg-cyan-100 text-cyan-800",
  organization: "bg-pink-100 text-pink-800",
  utility: "bg-gray-100 text-gray-800",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TemplateCard({ template, onGenerate }: { template: DocumentTemplate; onGenerate: (t: DocumentTemplate) => void }) {
  const FormatIcon = formatIcons[template.output_format] || FileText;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FormatIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{template.name}</CardTitle>
          </div>
          <Badge variant="outline" className={categoryColors[template.category] || ""}>
            {template.category}
          </Badge>
        </div>
        <CardDescription className="text-sm">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="uppercase text-xs">
            {template.output_format}
          </Badge>
          <Button size="sm" onClick={() => onGenerate(template)}>
            <Play className="h-3 w-3 mr-1" />
            Generate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateDialog({ 
  template, 
  open, 
  onOpenChange 
}: { 
  template: DocumentTemplate | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const generateMutation = useGenerateDocument();

  if (!template) return null;

  const schema = template.schema as Record<string, { type: string; required?: boolean; default?: unknown }>;
  const fields = Object.entries(schema);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert form data to proper types
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formData)) {
      const fieldSchema = schema[key];
      if (fieldSchema?.type === "boolean") {
        data[key] = value === "true";
      } else if (fieldSchema?.type === "integer" || fieldSchema?.type === "number") {
        data[key] = Number(value);
      } else {
        data[key] = value;
      }
    }

    const result = await generateMutation.mutateAsync({
      template_code: template.code,
      data,
    });

    if (result.download_url) {
      window.open(result.download_url, "_blank");
    }
    onOpenChange(false);
    setFormData({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate {template.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.length === 0 ? (
            <p className="text-muted-foreground text-sm">No input required for this template.</p>
          ) : (
            fields.map(([key, fieldSchema]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>
                  {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  {fieldSchema.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {fieldSchema.type === "object" ? (
                  <Textarea
                    id={key}
                    placeholder={`Enter JSON for ${key}`}
                    value={formData[key] || ""}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    required={fieldSchema.required}
                  />
                ) : (
                  <Input
                    id={key}
                    type={fieldSchema.type === "integer" ? "number" : "text"}
                    placeholder={fieldSchema.default ? String(fieldSchema.default) : ""}
                    value={formData[key] || ""}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    required={fieldSchema.required}
                  />
                )}
              </div>
            ))
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={generateMutation.isPending}>
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate & Download
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Documents() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [generateTemplate, setGenerateTemplate] = useState<DocumentTemplate | null>(null);
  
  const { data: templates, isLoading: templatesLoading } = useDocumentTemplates(selectedCategory);
  const { data: history, isLoading: historyLoading } = useDocumentHistory(20);

  const filteredTemplates = templates?.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(templates?.map(t => t.category) || [])];

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <FileOutput className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Document Generator</h1>
            <p className="text-muted-foreground">Generate invoices, reports, exports, and more</p>
          </div>
        </div>

        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="history">Recent Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={!selectedCategory ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(undefined)}
                >
                  All
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Template Grid */}
            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates?.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center text-muted-foreground">
                  No templates found matching your search.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates?.map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onGenerate={setGenerateTemplate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : history?.length === 0 ? (
              <Card className="py-12">
                <CardContent className="text-center text-muted-foreground">
                  No documents generated yet. Use a template to get started.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Documents</CardTitle>
                  <CardDescription>Your recently generated documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history?.map(doc => {
                      const FormatIcon = formatIcons[doc.output_format] || FileText;
                      return (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FormatIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{doc.file_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                <span>•</span>
                                {formatFileSize(doc.file_size)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="uppercase text-xs">
                            {doc.output_format}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Generate Dialog */}
        <GenerateDialog
          template={generateTemplate}
          open={!!generateTemplate}
          onOpenChange={(open) => !open && setGenerateTemplate(null)}
        />
      </main>
    </div>
  );
}
