-- Add video-specific columns to drone_assets
ALTER TABLE drone_assets
ADD COLUMN IF NOT EXISTS video_duration_seconds numeric;
ALTER TABLE drone_assets
ADD COLUMN IF NOT EXISTS video_resolution text;
ALTER TABLE drone_assets
ADD COLUMN IF NOT EXISTS video_fps numeric;
ALTER TABLE drone_assets
ADD COLUMN IF NOT EXISTS video_codec text;
ALTER TABLE drone_assets
ADD COLUMN IF NOT EXISTS video_bitrate integer;
ALTER TABLE drone_assets
ADD COLUMN IF NOT EXISTS thumbnail_url text;
-- Add index for video assets lookup
CREATE INDEX IF NOT EXISTS idx_drone_assets_video ON drone_assets(job_id)
WHERE file_type = 'video';
COMMENT ON COLUMN drone_assets.video_duration_seconds IS 'Duration of video in seconds';
COMMENT ON COLUMN drone_assets.video_resolution IS 'Video resolution e.g. 3840x2160';
COMMENT ON COLUMN drone_assets.video_fps IS 'Frames per second';
COMMENT ON COLUMN drone_assets.video_codec IS 'Video codec e.g. h264, hevc';
COMMENT ON COLUMN drone_assets.video_bitrate IS 'Video bitrate in kbps';
COMMENT ON COLUMN drone_assets.thumbnail_url IS 'URL to video thumbnail image';