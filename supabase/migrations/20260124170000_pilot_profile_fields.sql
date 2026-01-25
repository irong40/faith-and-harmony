-- Add Part 107 certification fields to profiles
-- This enables pilot certification tracking in Trestle
-- Add Part 107 certificate number
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS part_107_number TEXT;
-- Add Part 107 expiration date
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS part_107_expiry DATE;
-- Add index for efficient pilot lookups
CREATE INDEX IF NOT EXISTS idx_profiles_part_107_expiry ON profiles(part_107_expiry);
-- Comment for documentation
COMMENT ON COLUMN profiles.part_107_number IS 'FAA Part 107 Remote Pilot Certificate number';
COMMENT ON COLUMN profiles.part_107_expiry IS 'Expiration date of Part 107 certification';