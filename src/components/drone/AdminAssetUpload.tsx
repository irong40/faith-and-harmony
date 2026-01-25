import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, X, CheckCircle, Loader2, Video, Image as ImageIcon } from "lucide-react";
import { processVideoFile, detectCodecFromFilename } from "@/lib/videoHelpers";

interface AdminAssetUploadProps {
    jobId: string;
    onUploadComplete: () => void;
}

interface UploadingFile {
    file: File;
    progress: number;
    status: "pending" | "uploading" | "processing" | "complete" | "error";
    error?: string;
}

export default function AdminAssetUpload({ jobId, onUploadComplete }: AdminAssetUploadProps) {
    const { toast } = useToast();
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadFile = useCallback(async (file: File, index: number) => {
        // Update status to uploading
        setUploadingFiles(prev => prev.map((f, i) =>
            i === index ? { ...f, status: "uploading", progress: 10 } : f
        ));

        try {
            // Determine file type
            const isVideo = file.type.startsWith("video/");
            const isRaw = /\.(dng|raw|arw|cr2|cr3|nef|orf|rw2)$/i.test(file.name);
            const fileType = isVideo ? "video" : isRaw ? "raw" : "photo";

            // Create storage path
            const storagePath = `${jobId}/raw/${file.name}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from("drone-jobs")
                .upload(storagePath, file, {
                    cacheControl: "3600",
                    upsert: true, // Allow overwrite for admin
                });

            if (uploadError) throw new Error(uploadError.message);

            setUploadingFiles(prev => prev.map((f, i) =>
                i === index ? { ...f, progress: 50 } : f
            ));

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from("drone-jobs")
                .getPublicUrl(storagePath);

            // Create asset record
            const { data: asset, error: insertError } = await supabase
                .from("drone_assets")
                .insert({
                    job_id: jobId,
                    file_name: file.name,
                    file_path: publicUrl,
                    file_type: fileType,
                    qa_status: "pending",
                    sort_order: index,
                })
                .select()
                .single();

            if (insertError) throw new Error(insertError.message);

            setUploadingFiles(prev => prev.map((f, i) =>
                i === index ? { ...f, progress: 70, status: "processing" } : f
            ));

            // Extract video metadata if it's a video
            if (isVideo && asset) {
                try {
                    const { metadata, thumbnailBlob } = await processVideoFile(file);

                    // Upload thumbnail
                    const thumbnailPath = `${jobId}/thumbnails/${asset.id}_thumb.jpg`;
                    await supabase.storage
                        .from("drone-jobs")
                        .upload(thumbnailPath, thumbnailBlob, {
                            contentType: "image/jpeg",
                            upsert: true,
                        });

                    const { data: { publicUrl: thumbUrl } } = supabase.storage
                        .from("drone-jobs")
                        .getPublicUrl(thumbnailPath);

                    // Update asset with video metadata
                    await supabase
                        .from("drone_assets")
                        .update({
                            video_duration_seconds: metadata.duration_seconds,
                            video_resolution: metadata.resolution,
                            video_fps: metadata.fps,
                            video_codec: detectCodecFromFilename(file.name),
                            thumbnail_url: thumbUrl,
                        })
                        .eq("id", asset.id);

                } catch (videoError) {
                    console.warn("Video metadata extraction failed:", videoError);
                    // Non-fatal - continue without metadata
                }
            }

            // Mark complete
            setUploadingFiles(prev => prev.map((f, i) =>
                i === index ? { ...f, status: "complete", progress: 100 } : f
            ));

        } catch (err) {
            setUploadingFiles(prev => prev.map((f, i) =>
                i === index ? { ...f, status: "error", error: err instanceof Error ? err.message : "Upload failed" } : f
            ));
        }
    }, [jobId]);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const validFiles = fileArray.filter(f =>
            f.type.startsWith("image/") ||
            f.type.startsWith("video/") ||
            /\.(dng|raw|arw|cr2|cr3|nef|orf|rw2)$/i.test(f.name)
        );

        if (validFiles.length === 0) {
            toast({ title: "No valid files", description: "Please select image or video files", variant: "destructive" });
            return;
        }

        const startIndex = uploadingFiles.length;
        const newFiles: UploadingFile[] = validFiles.map(file => ({
            file,
            progress: 0,
            status: "pending",
        }));

        setUploadingFiles(prev => [...prev, ...newFiles]);

        // Start uploads
        validFiles.forEach((file, i) => {
            uploadFile(file, startIndex + i);
        });
    }, [uploadFile, uploadingFiles.length, toast]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const clearCompleted = () => {
        const hasIncomplete = uploadingFiles.some(f => f.status === "uploading" || f.status === "pending" || f.status === "processing");
        setUploadingFiles(prev => prev.filter(f => f.status !== "complete" && f.status !== "error"));
        if (!hasIncomplete) {
            onUploadComplete();
        }
    };

    const completedCount = uploadingFiles.filter(f => f.status === "complete").length;
    const inProgressCount = uploadingFiles.filter(f => f.status !== "complete" && f.status !== "error").length;

    // Auto-refresh when all uploads complete
    if (uploadingFiles.length > 0 && inProgressCount === 0 && completedCount > 0) {
        setTimeout(() => {
            onUploadComplete();
        }, 500);
    }

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onClick={() => fileInputRef.current?.click()}
                className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragging
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    }
        `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,.dng,.raw,.arw,.cr2,.cr3,.nef,.orf,.rw2"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium text-sm">
                    {isDragging ? "Drop files here" : "Click or drag files to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, DNG, RAW, MP4, MOV
                </p>
            </div>

            {/* Upload Progress */}
            {uploadingFiles.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            {completedCount}/{uploadingFiles.length} uploaded
                        </span>
                        {inProgressCount === 0 && (
                            <Button variant="ghost" size="sm" onClick={clearCompleted}>
                                <X className="h-4 w-4 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {uploadingFiles.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                {item.file.type.startsWith("video/") ? (
                                    <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                ) : (
                                    <ImageIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="truncate flex-1">{item.file.name}</span>
                                {item.status === "complete" && <CheckCircle className="h-4 w-4 text-green-600" />}
                                {item.status === "error" && <span className="text-xs text-destructive">{item.error}</span>}
                                {(item.status === "uploading" || item.status === "pending" || item.status === "processing") && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
