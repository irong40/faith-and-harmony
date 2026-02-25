import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { processVideoFile, detectCodecFromFilename } from "@/lib/videoHelpers";

interface VideoUploadProcessorProps {
    jobId: string;
    onProcessingComplete?: (assetId: string) => void;
}

/**
 * Hook for processing uploaded video files
 * Extracts metadata and generates thumbnails client-side
 */
export function useVideoUploadProcessor({ jobId, onProcessingComplete }: VideoUploadProcessorProps) {
    const { toast } = useToast();
    const [processing, setProcessing] = useState(false);

    const processVideo = useCallback(async (file: File, assetId: string) => {
        setProcessing(true);

        try {
            // Extract metadata and generate thumbnail
            const { metadata, thumbnailBlob, thumbnailDataUrl } = await processVideoFile(file);

            // Upload thumbnail to storage
            const thumbnailPath = `${jobId}/thumbnails/${assetId}_thumb.jpg`;
            const { error: uploadError } = await supabase.storage
                .from("drone-jobs")
                .upload(thumbnailPath, thumbnailBlob, {
                    contentType: "image/jpeg",
                    upsert: true,
                });

            if (uploadError) {
                console.error("Failed to upload thumbnail:", uploadError);
            }

            // Get public URL for thumbnail
            const { data: { publicUrl } } = supabase.storage
                .from("drone-jobs")
                .getPublicUrl(thumbnailPath);

            // Detect codec from filename
            const codec = detectCodecFromFilename(file.name);

            // Update asset record with video metadata
            const { error: updateError } = await supabase
                .from("drone_assets")
                .update({
                    video_duration_seconds: metadata.duration_seconds,
                    video_resolution: metadata.resolution,
                    video_fps: metadata.fps,
                    video_codec: codec,
                    thumbnail_url: uploadError ? thumbnailDataUrl : publicUrl, // Fallback to data URL if upload failed
                })
                .eq("id", assetId);

            if (updateError) {
                console.error("Failed to update asset metadata:", updateError);
                toast({
                    title: "Metadata update failed",
                    description: "Video uploaded but metadata extraction failed",
                    variant: "destructive",
                });
            } else {
                toast({
                    title: "Video processed",
                    description: `Duration: ${Math.round(metadata.duration_seconds)}s, ${metadata.resolution}`,
                });

                onProcessingComplete?.(assetId);
            }

        } catch (error) {
            console.error("Video processing error:", error);
            toast({
                title: "Video processing failed",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    }, [jobId, toast, onProcessingComplete]);

    return {
        processVideo,
        processing,
    };
}

/**
 * Process all video assets for a job that don't have metadata yet
 */
export async function batchProcessVideos(jobId: string): Promise<void> {
    const { data: assets, error } = await supabase
        .from("drone_assets")
        .select("id, file_path, file_name, file_type")
        .eq("job_id", jobId)
        .eq("file_type", "video")
        .is("video_duration_seconds", null);

    if (error) {
        console.error("Failed to fetch unprocessed videos:", error);
        return;
    }

    // Found ${assets?.length || 0} videos to process

    // Note: Batch processing would require fetching the actual file blobs
    // This is a placeholder for the pattern - actual implementation would need
    // to either process on upload or fetch signed URLs and process them
}
