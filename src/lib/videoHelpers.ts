/**
 * Video processing utilities for extracting metadata and generating thumbnails
 * Uses HTML5 Video API for client-side processing
 */

export interface VideoMetadata {
    duration_seconds: number;
    resolution: string;
    fps: number | null;
    width: number;
    height: number;
}

export interface VideoProcessingResult {
    metadata: VideoMetadata;
    thumbnailBlob: Blob;
    thumbnailDataUrl: string;
}

/**
 * Extract video metadata from a video file or URL
 * @param source - File object or URL string
 * @returns Promise with video metadata
 */
export async function extractVideoMetadata(source: File | string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;

        const cleanup = () => {
            if (video.src && video.src.startsWith('blob:')) {
                URL.revokeObjectURL(video.src);
            }
            video.remove();
        };

        video.onerror = () => {
            cleanup();
            reject(new Error('Failed to load video metadata'));
        };

        video.onloadedmetadata = () => {
            try {
                const metadata: VideoMetadata = {
                    duration_seconds: Math.round(video.duration * 100) / 100,
                    width: video.videoWidth,
                    height: video.videoHeight,
                    resolution: `${video.videoWidth}x${video.videoHeight}`,
                    // FPS cannot be reliably extracted from HTML5 video element
                    // Would require more complex analysis or server-side processing
                    fps: null,
                };

                cleanup();
                resolve(metadata);
            } catch (error) {
                cleanup();
                reject(error);
            }
        };

        // Set source
        if (typeof source === 'string') {
            video.src = source;
        } else {
            video.src = URL.createObjectURL(source);
        }

        video.load();
    });
}

/**
 * Generate a thumbnail from a video at a specific time
 * @param source - File object or URL string
 * @param timeInSeconds - Time in video to capture (default: 1 second)
 * @param maxWidth - Maximum width of thumbnail (default: 400px)
 * @returns Promise with thumbnail as Blob and data URL
 */
export async function generateVideoThumbnail(
    source: File | string,
    timeInSeconds = 1,
    maxWidth = 400
): Promise<{ blob: Blob; dataUrl: string }> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.crossOrigin = 'anonymous';

        const cleanup = () => {
            if (video.src && video.src.startsWith('blob:')) {
                URL.revokeObjectURL(video.src);
            }
            video.remove();
        };

        video.onerror = () => {
            cleanup();
            reject(new Error('Failed to load video for thumbnail generation'));
        };

        video.onloadedmetadata = () => {
            // Ensure we don't seek past the video duration
            const seekTime = Math.min(timeInSeconds, video.duration - 0.5);
            video.currentTime = seekTime;
        };

        video.onseeked = async () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    cleanup();
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Calculate dimensions maintaining aspect ratio
                const aspectRatio = video.videoHeight / video.videoWidth;
                canvas.width = Math.min(maxWidth, video.videoWidth);
                canvas.height = canvas.width * aspectRatio;

                // Draw video frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to blob
                canvas.toBlob((blob) => {
                    if (!blob) {
                        cleanup();
                        reject(new Error('Failed to create thumbnail blob'));
                        return;
                    }

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    cleanup();
                    resolve({ blob, dataUrl });
                }, 'image/jpeg', 0.8);

            } catch (error) {
                cleanup();
                reject(error);
            }
        };

        // Set source
        if (typeof source === 'string') {
            video.src = source;
        } else {
            video.src = URL.createObjectURL(source);
        }

        video.load();
    });
}

/**
 * Process video file - extract metadata and generate thumbnail
 * @param file - Video file to process
 * @returns Promise with complete processing results
 */
export async function processVideoFile(file: File): Promise<VideoProcessingResult> {
    const metadata = await extractVideoMetadata(file);
    const { blob, dataUrl } = await generateVideoThumbnail(file);

    return {
        metadata,
        thumbnailBlob: blob,
        thumbnailDataUrl: dataUrl,
    };
}

/**
 * Format duration in seconds to human-readable format (MM:SS or HH:MM:SS)
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get video codec from file extension (basic detection)
 * @param filename - Name of the video file
 * @returns Codec string or null
 */
export function detectCodecFromFilename(filename: string): string | null {
    const ext = filename.toLowerCase().split('.').pop();

    const codecMap: Record<string, string> = {
        'mp4': 'h264',
        'mov': 'h264',
        'm4v': 'h264',
        'webm': 'vp8/vp9',
        'mkv': 'h264/hevc',
        'avi': 'various',
    };

    return codecMap[ext || ''] || null;
}
