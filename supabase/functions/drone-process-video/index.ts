import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface VideoMetadata {
    duration_seconds: number | null;
    resolution: string | null;
    fps: number | null;
    codec: string | null;
    bitrate: number | null;
}

interface ProcessVideoRequest {
    asset_id: string;
    job_id?: string;
}

/**
 * Parse video metadata from file headers
 * This is a basic implementation - for more accurate metadata,
 * consider using a video processing service
 */
async function extractVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
    // Default values - will be populated by client-side extraction
    return {
        duration_seconds: null,
        resolution: null,
        fps: null,
        codec: null,
        bitrate: null,
    };
}

/**
 * Generate a thumbnail URL from video
 * For now, returns null - will be generated client-side or via external service
 */
function generateThumbnailUrl(_videoUrl: string): string | null {
    return null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { asset_id, job_id } = await req.json() as ProcessVideoRequest;

        // Batch mode: process all video assets for a job
        if (job_id) {
            console.log(`Batch video processing for job: ${job_id}`);

            const { data: assets, error } = await supabase
                .from("drone_assets")
                .select("id, file_path, file_name, file_type")
                .eq("job_id", job_id)
                .eq("file_type", "video")
                .is("video_duration_seconds", null);

            if (error) throw error;

            let processed = 0;
            let failed = 0;

            for (const asset of assets || []) {
                try {
                    // Get signed URL for the video
                    const { data: signedUrlData } = await supabase.storage
                        .from("drone-jobs")
                        .createSignedUrl(asset.file_path, 3600);

                    if (!signedUrlData?.signedUrl) {
                        failed++;
                        continue;
                    }

                    const metadata = await extractVideoMetadata(signedUrlData.signedUrl);
                    const thumbnailUrl = generateThumbnailUrl(signedUrlData.signedUrl);

                    await supabase
                        .from("drone_assets")
                        .update({
                            video_duration_seconds: metadata.duration_seconds,
                            video_resolution: metadata.resolution,
                            video_fps: metadata.fps,
                            video_codec: metadata.codec,
                            video_bitrate: metadata.bitrate,
                            thumbnail_url: thumbnailUrl,
                        })
                        .eq("id", asset.id);

                    processed++;
                } catch (e) {
                    console.error(`Failed to process video ${asset.id}:`, e);
                    failed++;
                }
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Processed ${processed} videos, ${failed} failed`,
                    processed,
                    failed,
                    total: assets?.length || 0,
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Single asset mode
        if (!asset_id) {
            return new Response(
                JSON.stringify({ error: "asset_id or job_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get asset details
        const { data: asset, error: assetError } = await supabase
            .from("drone_assets")
            .select("id, file_path, file_name, file_type")
            .eq("id", asset_id)
            .single();

        if (assetError || !asset) {
            console.error("Asset not found:", assetError);
            return new Response(
                JSON.stringify({ error: "Asset not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check if it's a video
        if (asset.file_type !== "video") {
            return new Response(
                JSON.stringify({ error: "Asset is not a video", skipped: true }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Processing video: ${asset.file_name}`);

        // Get signed URL for the video
        const { data: signedUrlData } = await supabase.storage
            .from("drone-jobs")
            .createSignedUrl(asset.file_path, 3600);

        if (!signedUrlData?.signedUrl) {
            return new Response(
                JSON.stringify({ error: "Could not access video file" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const metadata = await extractVideoMetadata(signedUrlData.signedUrl);
        const thumbnailUrl = generateThumbnailUrl(signedUrlData.signedUrl);

        // Update the asset record
        const { error: updateError } = await supabase
            .from("drone_assets")
            .update({
                video_duration_seconds: metadata.duration_seconds,
                video_resolution: metadata.resolution,
                video_fps: metadata.fps,
                video_codec: metadata.codec,
                video_bitrate: metadata.bitrate,
                thumbnail_url: thumbnailUrl,
            })
            .eq("id", asset_id);

        if (updateError) {
            console.error("Failed to update asset:", updateError);
            return new Response(
                JSON.stringify({ error: updateError.message }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Video processed: ${asset.file_name}`);

        return new Response(
            JSON.stringify({
                success: true,
                asset_id,
                metadata,
                thumbnail_url: thumbnailUrl,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Video processing error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
