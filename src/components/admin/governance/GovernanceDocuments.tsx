import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const AGENT_FOLDERS = [
  "compliance_sentinel",
  "financial_analyst",
  "governance_scribe",
  "document_drafter",
] as const;

const AGENT_LABELS: Record<string, string> = {
  compliance_sentinel: "Compliance Sentinel",
  financial_analyst: "Financial Analyst",
  governance_scribe: "Governance Scribe",
  document_drafter: "Document Drafter",
};

interface GovernanceFile {
  name: string;
  folder: string;
  fullPath: string;
  created_at: string;
}

async function listFilesRecursive(
  folder: string,
  prefix: string,
): Promise<GovernanceFile[]> {
  const { data, error } = await supabase.storage
    .from("governance")
    .list(prefix, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (error || !data) return [];

  const files: GovernanceFile[] = [];

  for (const item of data) {
    if (item.name === ".emptyFolderPlaceholder") continue;

    const fullPath = `${prefix}/${item.name}`;

    // If no metadata.size, it's a subfolder — recurse
    if (!item.metadata?.size) {
      const nested = await listFilesRecursive(folder, fullPath);
      files.push(...nested);
    } else {
      files.push({
        name: item.name,
        folder,
        fullPath,
        created_at: item.created_at ?? new Date().toISOString(),
      });
    }
  }

  return files;
}

function useGovernanceFiles() {
  return useQuery({
    queryKey: ["governance-files"],
    queryFn: async () => {
      const allFiles: GovernanceFile[] = [];

      for (const folder of AGENT_FOLDERS) {
        const files = await listFilesRecursive(folder, folder);
        allFiles.push(...files);
      }

      return allFiles.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
    staleTime: 60_000,
  });
}

export default function GovernanceDocuments() {
  const [search, setSearch] = useState("");
  const { data: files, isLoading, error } = useGovernanceFiles();

  const filtered = files?.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleDownload(fullPath: string) {
    const { data, error } = await supabase.storage
      .from("governance")
      .createSignedUrl(fullPath, 300);

    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link");
      return;
    }

    window.open(data.signedUrl, "_blank");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive">Failed to load documents: {(error as Error).message}</p>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !filtered?.length ? (
          <p className="text-sm text-muted-foreground">
            No governance documents found. Documents will appear here as agents generate them.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-20">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((file) => (
                <TableRow key={file.fullPath}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{AGENT_LABELS[file.folder] ?? file.folder}</TableCell>
                  <TableCell>{format(new Date(file.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.fullPath)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
