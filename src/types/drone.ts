import { Database, Json } from "@/integrations/supabase/types";

export type QAStatus = Database["public"]["Enums"]["qa_status"];

export interface QualityIssue {
    category: string;
    severity: string;
    description: string;
    correctable_in_post: boolean;
    estimated_fix_time_minutes: number;
    recommended_action: string;
    client_description?: string;
    type?: string;
}

export interface QAResults {
    overall_score: number;
    recommendation: string;
    ready_for_delivery: boolean;
    shot_classification?: {
        type: string;
        confidence: number;
        matches_expected: boolean;
    };
    issues: QualityIssue[];
    analysis?: {
        horizon_leveling?: { score: number; tilt_degrees?: number };
        sharpness?: { score: number; notes?: string };
        exposure?: { score: number; notes?: string };
        composition?: { score: number; notes?: string };
        technical?: { score: number; notes?: string };
    };
    highlights?: string[];
    summary?: string;
}

export interface ProcessingProfile {
    lightroom_preset?: string;
    [key: string]: unknown;
}

export interface DroneAsset {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    qa_status: QAStatus | null;
    qa_score: number | null;
    qa_results: Json | null;
    sort_order: number | null;
    created_at: string;
    exif_data?: Json | null;
    camera_model?: string | null;
    capture_date?: string | null;
    gps_latitude?: number | null;
    gps_longitude?: number | null;
    gps_altitude?: number | null;
    // Video-specific fields
    video_duration_seconds?: number | null;
    video_resolution?: string | null;
    video_fps?: number | null;
    video_codec?: string | null;
    video_bitrate?: number | null;
    thumbnail_url?: string | null;
    // Pipeline fields
    media_format?: string | null;
    compass_bearing?: number | null;
    lr_exported_path?: string | null;
    pipeline_excluded?: boolean;
    coverage_tag?: string | null;
    processing_status?: string | null;
    processed_path?: string | null;
}
