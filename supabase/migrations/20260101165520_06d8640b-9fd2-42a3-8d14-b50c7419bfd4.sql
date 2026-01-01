-- Update drone_packages with detailed processing profiles

-- Basic Residential (30 min budget)
UPDATE drone_packages SET processing_profile = '{
  "lightroom_preset": "FH_RealEstate_Basic",
  "lens_correction": true,
  "horizon_straighten": true,
  "exposure_balance": {"shadows": 15, "highlights": -10},
  "vibrance_boost": 8,
  "sky_enhance": false,
  "sky_replace": false,
  "output_formats": ["jpg_web"],
  "jpg_quality": 85,
  "resize_max_px": 2400
}'::jsonb WHERE code = 'PHOTO_495';

-- Standard Residential (60 min budget)
UPDATE drone_packages SET processing_profile = '{
  "lightroom_preset": "FH_RealEstate_Standard",
  "lens_correction": true,
  "horizon_straighten": true,
  "exposure_balance": {"shadows": 20, "highlights": -15},
  "vibrance_boost": 12,
  "sky_enhance": true,
  "sky_replace": false,
  "output_formats": ["jpg_web", "jpg_print"],
  "jpg_quality": 90,
  "resize_max_px": 4000
}'::jsonb WHERE code = 'PHOTO_VIDEO_795';

-- Premium Residential (90 min budget - includes manual review gate)
UPDATE drone_packages SET processing_profile = '{
  "lightroom_preset": "FH_RealEstate_Premium",
  "lens_correction": true,
  "horizon_straighten": true,
  "exposure_balance": {"shadows": 25, "highlights": -20, "whites": 5},
  "vibrance_boost": 15,
  "sky_enhance": true,
  "sky_replace": "manual_review",
  "review_gate": true,
  "output_formats": ["jpg_web", "jpg_print", "raw_archive"],
  "jpg_quality": 95,
  "resize_max_px": null
}'::jsonb WHERE code = 'PREMIUM_1250';

-- Construction Progress (45 min budget - includes labeling)
UPDATE drone_packages SET processing_profile = '{
  "lightroom_preset": "FH_Construction_Progress",
  "lens_correction": true,
  "horizon_straighten": true,
  "exposure_balance": {"shadows": 10, "highlights": -10},
  "vibrance_boost": 0,
  "sky_enhance": false,
  "sky_replace": false,
  "labeling": {
    "enabled": true,
    "include_compass": true,
    "include_date": true,
    "include_address": true,
    "font": "Arial Bold",
    "position": "bottom_left"
  },
  "output_formats": ["jpg_labeled", "jpg_unlabeled"],
  "jpg_quality": 90,
  "resize_max_px": null
}'::jsonb WHERE code = 'PROGRESS_800';