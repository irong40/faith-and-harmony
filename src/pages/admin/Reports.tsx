import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminNav from "./components/AdminNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Search,
  Loader2,
  Pencil,
  Download,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { useJobReports, useDeleteReport, useGenerateReportPDF } from "@/hooks/useReportBuilder";
import type { ReportStatus } from "@/types/report";

const STATUS_BADGE: Record<ReportStatus, { label: string; variant: "outline" | "default" | "secondary"; className: string }> = {
  draft: { label: "Draft", variant: "outline", className: "border-yellow-500 text-yellow-700 bg-yellow-50" },
  final: { label: "Final", variant: "default", className: "bg-green-600 text-white" },
  archived: { label: "Archived", variant: "secondary", className: "bg-gray-200 text-gray-600" },
};

export default function Reports() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const statusFilter = tab === "all" ? undefined : (tab as ReportStatus);
  const { data: reports, isLoading } = useJobReports({ status: statusFilter });
  const deleteMutation = useDeleteReport();
  const pdfMutation = useGenerateReportPDF();

  const filtered = (reports ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.clients?.name?.toLowerCase().includes(q) ||
      r.clients?.company?.toLowerCase().includes(q)
    );
  });

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Reports</h1>
              <p className="text-muted-foreground">
                Drone inspection and census reports
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/admin/reports/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="final">Final</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {["all", "draft", "final", "archived"].map((tabKey) => (
            <TabsContent key={tabKey} value={tabKey}>
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <Card className="py-16">
                  <CardContent className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No reports found</p>
                    <p className="text-sm mt-1">Create your first report to get started.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((report) => {
                        const badge = STATUS_BADGE[report.status];
                        return (
                          <TableRow
                            key={report.id}
                            className="cursor-pointer"
                            onClick={() => navigate(`/admin/reports/${report.id}/edit`)}
                          >
                            <TableCell className="font-medium">{report.title}</TableCell>
                            <TableCell>{report.clients?.name ?? "—"}</TableCell>
                            <TableCell>{report.report_templates?.name ?? "—"}</TableCell>
                            <TableCell>
                              {report.report_date
                                ? format(new Date(report.report_date), "MMM d, yyyy")
                                : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={badge.variant} className={badge.className}>
                                {badge.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit"
                                  onClick={() => navigate(`/admin/reports/${report.id}/edit`)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Download PDF"
                                  disabled={pdfMutation.isPending}
                                  onClick={() => pdfMutation.mutate(report.id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete"
                                  onClick={() => setDeleteId(report.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Report</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The report and all associated images will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
