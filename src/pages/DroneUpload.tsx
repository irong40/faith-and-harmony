import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Upload, Camera, CheckCircle, XCircle, Loader2,
  MapPin, Home, ImageIcon, Video, AlertTriangle, Clock
} from "lucide-react";
import { format } from "date-fns";

interface JobInfo {
  id: string;
  job_number: string;
  property_address: string;
  property_city: string | null;
  property_state: string | null;
  property_type: string;
  package: {
    name: string;
    shot_manifest: Array<{ type: string; count: number; description: string }> | null;
    features: string[] | null;
  } | null;
  uploaded_count: number;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  error?: string;
}

export default function DroneUpload() {
  const { token } = useParams<{ token: string }>();
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("No upload token provided");
        setValidating(false);
        return;
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke("drone-job-token", {
          body: { token },
        });

        if (fnError || !data?.valid) {
          setError(data?.error || "Invalid or expired upload link");
          setValid(false);
        } else {
          setJob(data.job);
          setUploadedCount(data.job.uploaded_count);
          setValid(true);
        }
      } catch (err) {
        setError("Failed to validate upload link");
      } finally {
        setValidating(false);
      }
    }

    validateToken();
  }, [token]);

  const uploadFile = useCallback(async (file: File, index: number) => {
    if (!job || !token) return;

    // Update status to uploading
    setUploadingFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, status: "uploading", progress: 0 } : f
    ));

    try {
      // Determine file type
      const isVideo = file.type.startsWith("video/");
      const isRaw = /\.(dng|raw|arw|cr2|cr3|nef|orf|rw2)$/i.test(file.name);
      const fileType = isVideo ? "video" : isRaw ? "raw" : "photo";

      // Create storage path: {job_id}/raw/{filename}
      const storagePath = `${job.id}/raw/${file.name}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("drone-jobs")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Update progress to 90% after storage upload
      setUploadingFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, progress: 90 } : f
      ));

      // Record the upload via edge function
      const { data, error: recordError } = await supabase.functions.invoke("drone-job-token?action=upload-complete", {
        body: {
          token,
          file_name: file.name,
          file_path: storagePath,
          file_size: file.size,
          file_type: fileType,
          mime_type: file.type,
        },
      });

      if (recordError || !data?.success) {
        throw new Error(recordError?.message || "Failed to record upload");
      }

      // Mark complete
      setUploadingFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: "complete", progress: 100 } : f
      ));
      setUploadedCount(prev => prev + 1);

    } catch (err) {
      setUploadingFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" } : f
      ));
    }
  }, [job, token]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f =>
      f.type.startsWith("image/") ||
      f.type.startsWith("video/") ||
      /\.(dng|raw|arw|cr2|cr3|nef|orf|rw2)$/i.test(f.name)
    );

    if (validFiles.length === 0) {
      return;
    }

    const newFiles: UploadingFile[] = validFiles.map(file => ({
      file,
      progress: 0,
      status: "pending",
    }));

    setUploadingFiles(prev => [...prev, ...newFiles]);

    // Start uploads
    const startIndex = uploadingFiles.length;
    validFiles.forEach((file, i) => {
      uploadFile(file, startIndex + i);
    });
  }, [uploadFile, uploadingFiles.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validating upload link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!valid || error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Upload Link Invalid</CardTitle>
            <CardDescription>
              {error || "This upload link is no longer valid."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Please contact Faith & Harmony if you need a new upload link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedCount = uploadingFiles.filter(f => f.status === "complete").length;
  const errorCount = uploadingFiles.filter(f => f.status === "error").length;
  const inProgressCount = uploadingFiles.filter(f => f.status === "uploading" || f.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/assets/drone/drone-logo-original.jpg"
                alt="Drone Services"
                className="h-10 w-10 object-contain"
              />
              <div>
                <h1 className="font-semibold text-lg">Faith & Harmony</h1>
                <p className="text-sm text-muted-foreground">Aerial Photography Upload</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {job?.job_number}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Job Info Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {job?.property_address}
                </CardTitle>
                <CardDescription>
                  {job?.property_city}, {job?.property_state}
                </CardDescription>
              </div>
              <Badge>
                <Home className="h-3 w-3 mr-1" />
                {job?.property_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              {job?.package && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Package:</span>
                  <Badge variant="secondary">{job.package.name}</Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Uploaded:</span>
                <span className="font-medium">{uploadedCount} files</span>
              </div>
            </div>

            {/* Shot Manifest */}
            {job?.package?.shot_manifest && job.package.shot_manifest.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium mb-2">Required Shots</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {job.package.shot_manifest.map((shot, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted rounded-md">
                        {shot.type === "video" ? (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span>{shot.count}x {shot.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upload Zone */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Files
            </CardTitle>
            <CardDescription>
              Drag and drop your photos and videos, or click to select files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                ${isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
                }
              `}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*,video/*,.dng,.raw,.arw,.cr2,.cr3,.nef,.orf,.rw2"
                className="hidden"
                onChange={handleFileInput}
              />
              <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-lg font-medium mb-1">
                {isDragging ? "Drop files here" : "Click or drag files to upload"}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG, DNG, RAW, MP4, MOV
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadingFiles.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upload Progress</CardTitle>
                <div className="flex gap-3 text-sm">
                  {completedCount > 0 && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {completedCount} complete
                    </span>
                  )}
                  {errorCount > 0 && (
                    <span className="flex items-center gap-1 text-destructive">
                      <XCircle className="h-4 w-4" />
                      {errorCount} failed
                    </span>
                  )}
                  {inProgressCount > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {inProgressCount} uploading
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {uploadingFiles.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {item.file.type.startsWith("video/") ? (
                      <Video className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm truncate">{item.file.name}</span>
                        {item.status === "complete" && (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        {item.status === "error" && (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        {(item.status === "uploading" || item.status === "pending") && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {item.status === "error" ? (
                        <p className="text-xs text-destructive">{item.error}</p>
                      ) : (
                        <Progress value={item.progress} className="h-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Upload Tips</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li>Upload both JPG and RAW files for best quality</li>
              <li>Include all video clips captured during the flight</li>
              <li>Keep this page open until all uploads complete</li>
              <li>You can upload more files at any time before the link expires</li>
            </ul>
          </AlertDescription>
        </Alert>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto py-4 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Faith & Harmony LLC. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
