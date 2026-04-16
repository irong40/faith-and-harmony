-- ============================================
-- SEED: Wildlife Census Pipeline Test Data
-- Flows through: processing_template → drone_assets → processing_job → job_report
-- ============================================

-- 1. Wildlife Census Processing Template
INSERT INTO public.processing_templates (
  id, package_id, path_code, display_name, preset_name, default_steps, step_definitions,
  qa_threshold, output_format, active
) VALUES (
  'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
  NULL,
  'WC',
  'Wildlife Census — Thermal Transect',
  'wildlife_census_thermal',
  '["file_detect", "exif_extract", "thermal_analysis", "species_classification", "population_estimate", "qa_gate", "report_generation", "packaging"]'::jsonb,
  '[
    {"name": "file_detect", "label": "File Detection", "script": "file-detect", "manual": false},
    {"name": "exif_extract", "label": "EXIF & GPS Extraction", "script": "drone-extract-exif", "manual": false},
    {"name": "thermal_analysis", "label": "Thermal Animal Detection", "script": "thermal-detect", "manual": false},
    {"name": "species_classification", "label": "Species Classification", "script": "species-classify", "manual": true},
    {"name": "population_estimate", "label": "Population Estimate (Distance Sampling)", "script": "pop-estimate", "manual": false},
    {"name": "qa_gate", "label": "QA Review", "script": null, "manual": true},
    {"name": "report_generation", "label": "Report Generation", "script": "report-gen", "manual": false},
    {"name": "packaging", "label": "Packaging & Delivery", "script": "package", "manual": false}
  ]'::jsonb,
  0.75,
  'pdf',
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. Seed drone_assets for the test job (DJ-2026-0003) — simulated thermal transect images
-- Using the existing job: cc621c44-629f-4c03-8dfe-0a39db77e50c (but we'll use the intake job)
-- Actually let's use the test job from the report: DJ-2026-0003

-- Find DJ-2026-0003 job id
DO $$
DECLARE
  v_job_id uuid;
  v_proc_id uuid;
  v_report_template_id uuid;
  v_report_id uuid;
BEGIN
  SELECT id INTO v_job_id FROM public.drone_jobs WHERE job_number = 'DJ-2026-0003' LIMIT 1;
  IF v_job_id IS NULL THEN
    RAISE NOTICE 'DJ-2026-0003 not found, skipping';
    RETURN;
  END IF;

  -- Insert thermal transect drone assets (simulated flight captures)
  INSERT INTO public.drone_assets (job_id, file_name, file_path, file_type, mime_type, file_size, gps_latitude, gps_longitude, gps_altitude, camera_model, capture_date, compass_bearing, coverage_tag, processing_status, qa_status, qa_score, sort_order)
  VALUES
    -- Flight 1: Transect 1-3 (April 10, pre-dawn)
    (v_job_id, 'T1_THERMAL_0001.RJPEG', 'thermal/flight1/T1_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6710, -75.9200, 91.4, 'Zenmuse H30T', '2026-04-10 04:32:00', 0, 'transect_1_start', 'complete', 'passed', 0.92, 1),
    (v_job_id, 'T1_THERMAL_0050.RJPEG', 'thermal/flight1/T1_THERMAL_0050.RJPEG', 'image', 'image/jpeg', 2048000, 36.6725, -75.9200, 91.4, 'Zenmuse H30T', '2026-04-10 04:38:00', 0, 'transect_1_mid', 'complete', 'passed', 0.89, 2),
    (v_job_id, 'T1_THERMAL_0100.RJPEG', 'thermal/flight1/T1_THERMAL_0100.RJPEG', 'image', 'image/jpeg', 2048000, 36.6740, -75.9200, 91.4, 'Zenmuse H30T', '2026-04-10 04:44:00', 0, 'transect_1_end', 'complete', 'passed', 0.91, 3),
    (v_job_id, 'T2_THERMAL_0001.RJPEG', 'thermal/flight1/T2_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6740, -75.9180, 91.4, 'Zenmuse H30T', '2026-04-10 04:48:00', 180, 'transect_2_start', 'complete', 'passed', 0.88, 4),
    (v_job_id, 'T2_THERMAL_0050.RJPEG', 'thermal/flight1/T2_THERMAL_0050.RJPEG', 'image', 'image/jpeg', 2048000, 36.6725, -75.9180, 91.4, 'Zenmuse H30T', '2026-04-10 04:54:00', 180, 'transect_2_mid', 'complete', 'passed', 0.90, 5),
    (v_job_id, 'T3_THERMAL_0001.RJPEG', 'thermal/flight1/T3_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6710, -75.9160, 91.4, 'Zenmuse H30T', '2026-04-10 05:02:00', 0, 'transect_3_start', 'complete', 'passed', 0.93, 6),
    -- Flight 2: Transect 4-6 (April 10)
    (v_job_id, 'T4_THERMAL_0001.RJPEG', 'thermal/flight2/T4_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6710, -75.9140, 91.4, 'Zenmuse H30T', '2026-04-10 05:25:00', 0, 'transect_4_start', 'complete', 'passed', 0.87, 7),
    (v_job_id, 'T5_THERMAL_0001.RJPEG', 'thermal/flight2/T5_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6740, -75.9120, 91.4, 'Zenmuse H30T', '2026-04-10 05:40:00', 180, 'transect_5_start', 'complete', 'passed', 0.91, 8),
    (v_job_id, 'T6_THERMAL_0001.RJPEG', 'thermal/flight2/T6_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6710, -75.9100, 91.4, 'Zenmuse H30T', '2026-04-10 05:55:00', 0, 'transect_6_start', 'complete', 'passed', 0.89, 9),
    -- Flight 3: Transect 7-9 (April 11)
    (v_job_id, 'T7_THERMAL_0001.RJPEG', 'thermal/flight3/T7_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6710, -75.9080, 91.4, 'Zenmuse H30T', '2026-04-11 04:30:00', 0, 'transect_7_start', 'complete', 'passed', 0.94, 10),
    (v_job_id, 'T8_THERMAL_0001.RJPEG', 'thermal/flight3/T8_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6740, -75.9060, 91.4, 'Zenmuse H30T', '2026-04-11 04:50:00', 180, 'transect_8_start', 'complete', 'passed', 0.90, 11),
    (v_job_id, 'T9_THERMAL_0001.RJPEG', 'thermal/flight3/T9_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6710, -75.9040, 91.4, 'Zenmuse H30T', '2026-04-11 05:10:00', 0, 'transect_9_start', 'complete', 'passed', 0.88, 12),
    -- Flight 4: Transect 10-12 (April 11)
    (v_job_id, 'T10_THERMAL_0001.RJPEG', 'thermal/flight4/T10_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6710, -75.9020, 91.4, 'Zenmuse H30T', '2026-04-11 05:30:00', 0, 'transect_10_start', 'complete', 'passed', 0.92, 13),
    (v_job_id, 'T11_THERMAL_0001.RJPEG', 'thermal/flight4/T11_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6740, -75.9000, 91.4, 'Zenmuse H30T', '2026-04-11 05:48:00', 180, 'transect_11_start', 'complete', 'passed', 0.91, 14),
    (v_job_id, 'T12_THERMAL_0001.RJPEG', 'thermal/flight4/T12_THERMAL_0001.RJPEG', 'image', 'image/jpeg', 2048000, 36.6710, -75.8980, 91.4, 'Zenmuse H30T', '2026-04-11 06:05:00', 0, 'transect_12_end', 'complete', 'passed', 0.93, 15)
  ON CONFLICT DO NOTHING;

  -- 3. Create processing_job (completed run)
  v_proc_id := gen_random_uuid();
  INSERT INTO public.processing_jobs (
    id, mission_id, processing_template_id, status, current_step,
    steps, triggered_by, idempotency_key, created_at, completed_at
  ) VALUES (
    v_proc_id,
    v_job_id,
    'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
    'complete',
    8,
    '[
      {"name":"file_detect","label":"File Detection","status":"complete","started_at":"2026-04-11T10:00:00Z","completed_at":"2026-04-11T10:00:15Z","output":{"files_found":15,"thermal_frames":15}},
      {"name":"exif_extract","label":"EXIF & GPS Extraction","status":"complete","started_at":"2026-04-11T10:00:16Z","completed_at":"2026-04-11T10:01:00Z","output":{"gps_points":15,"altitude_agl_avg":300}},
      {"name":"thermal_analysis","label":"Thermal Animal Detection","status":"complete","started_at":"2026-04-11T10:01:01Z","completed_at":"2026-04-11T10:08:30Z","output":{"detections":179,"species_clusters":5,"false_positive_rate":0.03}},
      {"name":"species_classification","label":"Species Classification","status":"complete","started_at":"2026-04-11T10:08:31Z","completed_at":"2026-04-11T10:15:00Z","output":{"classified":176,"unclassified":3,"species":["white_tailed_deer","wild_turkey","raccoon","red_fox"]}},
      {"name":"population_estimate","label":"Population Estimate","status":"complete","started_at":"2026-04-11T10:15:01Z","completed_at":"2026-04-11T10:16:00Z","output":{"estimate":127,"lower_95":100,"upper_95":153,"detection_probability":0.78,"cv":0.11}},
      {"name":"qa_gate","label":"QA Review","status":"complete","started_at":"2026-04-11T10:16:01Z","completed_at":"2026-04-11T11:00:00Z","output":{"reviewed_by":"Adam Pierce","approved":true,"notes":"All detections verified against RGB frames"}},
      {"name":"report_generation","label":"Report Generation","status":"complete","started_at":"2026-04-11T11:00:01Z","completed_at":"2026-04-11T11:02:00Z","output":{"report_id":"placeholder","sections_populated":15}},
      {"name":"packaging","label":"Packaging & Delivery","status":"complete","started_at":"2026-04-11T11:02:01Z","completed_at":"2026-04-11T11:05:00Z","output":{"package_size_gb":18.6,"files":6}}
    ]'::jsonb,
    '193afb80-92a3-49ff-8e92-2871fa91f4fd',
    'seed-wildlife-census-2026-04-16',
    '2026-04-11T10:00:00Z',
    '2026-04-11T11:05:00Z'
  );

  -- 4. Update drone_job with processing reference and status
  UPDATE public.drone_jobs SET
    processing_job_id = v_proc_id,
    processing_template_id = 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
    status = 'complete',
    photo_count = 15,
    property_type = 'wildlife_census',
    processing_started_at = '2026-04-11T10:00:00Z',
    processing_completed_at = '2026-04-11T11:05:00Z'
  WHERE id = v_job_id;

  -- 5. Get the wildlife census report template
  SELECT id INTO v_report_template_id FROM public.report_templates WHERE code = 'wildlife_census' LIMIT 1;

  -- 6. Update existing job_report (seeded earlier) with pipeline-generated data + review_status on all findings
  UPDATE public.job_reports SET
    template_id = v_report_template_id,
    title = 'Wildlife Census Report — Back Bay NWR Deer Survey',
    status = 'draft',
    prepared_by = 'Adam Pierce, Founder — CISSP, Part 107',
    classification = 'CLIENT CONFIDENTIAL',
    active_sections = ARRAY[
      'cover_page','executive_summary','methodology','equipment','flight_data',
      'weather_conditions','findings','species_table','population_estimate',
      'confidence_interval','detection_heatmap','transect_map','annotated_imagery',
      'anomaly_log','deliverables_manifest','appendix_flight_logs','appendix_raw_data'
    ],
    section_data = jsonb_build_object(
      'cover_page', jsonb_build_object(
        'title', 'Thermal Wildlife Census Report',
        'subtitle', 'Back Bay National Wildlife Refuge — Spring 2026 Deer Population Survey',
        'client_name', 'Justin Folks',
        'client_company', 'Virginia Department of Wildlife Resources',
        'property_address', 'Back Bay NWR, 4005 Sandpiper Rd, Virginia Beach, VA 23456',
        'report_date', '2026-04-16',
        'job_number', 'DJ-2026-0003',
        'pilot_name', 'Adam Pierce',
        'prepared_by', 'Adam Pierce, Founder — CISSP, Part 107',
        'classification', 'CLIENT CONFIDENTIAL'
      ),
      'executive_summary', jsonb_build_object(
        'summary', 'Sentinel Aerial Inspections conducted a thermal drone census of the white-tailed deer population across 850 acres of Back Bay National Wildlife Refuge on April 10-11, 2026. Using a DJI Matrice 4T (640x512 thermal), 12 transects were flown at 300 ft AGL during pre-dawn hours. 127 deer detected. Population density: 149/sq mi (95% CI: 118-180). 12% increase from Fall 2025 ground estimate of 113.',
        'key_metrics', jsonb_build_array(
          jsonb_build_object('label', 'Total Deer', 'value', '127'),
          jsonb_build_object('label', 'Survey Area', 'value', '850 acres'),
          jsonb_build_object('label', 'Density', 'value', '149/sq mi'),
          jsonb_build_object('label', 'Species', 'value', '4'),
          jsonb_build_object('label', 'Transects', 'value', '12'),
          jsonb_build_object('label', 'Flight Time', 'value', '3.1 hrs')
        )
      ),
      'methodology', jsonb_build_object(
        'description', 'Systematic strip-transect thermal survey per USFWS Aerial Survey Protocol. N-S transects at 200m spacing, 300 ft AGL, 3-5 mph.',
        'flight_pattern', 'Strip transect (N-S, 200m spacing)',
        'altitude_agl', '300 ft AGL',
        'gsd', 'Thermal: 8.5 cm/px, RGB: 1.2 cm/px',
        'software', jsonb_build_array('FlightHub 2', 'AirData UAV', 'QGIS 3.34', 'Distance 7.5')
      ),
      'equipment', jsonb_build_object(
        'aircraft_name', 'DJI Matrice 4T',
        'aircraft_model', 'M4T',
        'camera', '48MP Wide + 640x512 Thermal (30Hz uncooled VOx)',
        'rtk_enabled', true,
        'additional_sensors', jsonb_build_array('Laser Rangefinder', 'FPV Camera')
      ),
      'flight_data', jsonb_build_object(
        'flights', jsonb_build_array(
          jsonb_build_object('flight_number', 1, 'date', '2026-04-10', 'start_time', '04:32', 'end_time', '05:18', 'duration_minutes', 46, 'altitude_agl', 300, 'area_covered_acres', 210),
          jsonb_build_object('flight_number', 2, 'date', '2026-04-10', 'start_time', '05:25', 'end_time', '06:08', 'duration_minutes', 43, 'altitude_agl', 300, 'area_covered_acres', 195),
          jsonb_build_object('flight_number', 3, 'date', '2026-04-11', 'start_time', '04:30', 'end_time', '05:22', 'duration_minutes', 52, 'altitude_agl', 300, 'area_covered_acres', 230),
          jsonb_build_object('flight_number', 4, 'date', '2026-04-11', 'start_time', '05:30', 'end_time', '06:15', 'duration_minutes', 45, 'altitude_agl', 300, 'area_covered_acres', 215)
        ),
        'total_area_acres', 850,
        'total_flight_time_minutes', 186
      ),
      'weather_conditions', jsonb_build_object(
        'temperature_f', 42, 'wind_speed_mph', 3, 'wind_direction', 'NW',
        'cloud_cover', 'Clear', 'visibility', '10+ miles', 'precipitation', 'None',
        'station', 'KNTU (NAS Oceana)'
      ),
      'findings', jsonb_build_object(
        'summary', '127 white-tailed deer across 850 acres. Highest density along west marsh edge.',
        'findings', jsonb_build_array(
          jsonb_build_object('id', 'f1', 'severity', 'info', 'title', 'High-density cluster — West Marsh Edge', 'description', '38 deer in 90-acre zone along western marsh boundary.', 'location', '36.6712, -75.9234', 'recommendation', 'Monitor density vs carrying capacity.', 'review_status', 'pending'),
          jsonb_build_object('id', 'f2', 'severity', 'info', 'title', 'Pine upland corridor — moderate density', 'description', '24 deer in central pine strip (140 acres).', 'location', '36.6685, -75.9156', 'review_status', 'pending'),
          jsonb_build_object('id', 'f3', 'severity', 'low', 'title', '3 unclassified thermal anomalies', 'description', 'SE wetland zone — thermal profiles suggest large mammal, possibly feral hog.', 'location', '36.6598, -75.9089', 'recommendation', 'Deploy trail cameras at GPS coords for 2-week confirmation.', 'review_status', 'pending'),
          jsonb_build_object('id', 'f4', 'severity', 'medium', 'title', 'Fence breach — NE boundary', 'description', '12-ft gap in refuge fence at NE access road. Deer tracks in RGB.', 'location', '36.6745, -75.9067', 'recommendation', 'Repair gap to prevent deer-vehicle conflicts on Sandpiper Rd.', 'review_status', 'pending')
        )
      ),
      'species_table', jsonb_build_object(
        'species', jsonb_build_array(
          jsonb_build_object('species', 'White-tailed Deer', 'count', 127, 'confidence', 'high', 'notes', '89 adults, 38 juveniles'),
          jsonb_build_object('species', 'Wild Turkey', 'count', 34, 'confidence', 'high'),
          jsonb_build_object('species', 'Raccoon', 'count', 12, 'confidence', 'medium'),
          jsonb_build_object('species', 'Red Fox', 'count', 3, 'confidence', 'medium'),
          jsonb_build_object('species', 'Unclassified (possible feral hog)', 'count', 3, 'confidence', 'low', 'notes', 'Ground truthing recommended')
        ),
        'total_count', 179,
        'survey_area_acres', 850
      ),
      'population_estimate', jsonb_build_object(
        'estimate', 127, 'lower_bound', 100, 'upper_bound', 153,
        'confidence_level', '95%',
        'methodology_note', 'Distance sampling, half-normal detection function. ESW 85m. Detection probability 0.78.',
        'prior_survey_estimate', 113, 'prior_survey_date', '2025-10-15', 'trend', 'increasing'
      ),
      'confidence_interval', jsonb_build_object(
        'sample_size', 12, 'detection_probability', 0.78,
        'effective_strip_width', 85, 'transect_length_km', 34.2,
        'methodology', 'Half-normal detection function. CV=0.11. GoF p=0.42.'
      ),
      'anomaly_log', jsonb_build_object(
        'summary', '3 unclassified thermal anomalies in SE wetland. Possible feral hog.',
        'anomalies', jsonb_build_array(
          jsonb_build_object('id', 'a1', 'timestamp', '2026-04-11T05:42:18Z', 'gps_lat', 36.6598, 'gps_lng', -75.9089, 'anomaly_type', 'Unclassified large mammal', 'severity', 'medium', 'description', '~90cm body, low ground clearance, not deer gait.', 'review_status', 'pending'),
          jsonb_build_object('id', 'a2', 'timestamp', '2026-04-11T05:44:02Z', 'gps_lat', 36.6601, 'gps_lng', -75.9092, 'anomaly_type', 'Unclassified large mammal', 'severity', 'medium', 'description', 'Second individual, 45m from A1.', 'review_status', 'pending'),
          jsonb_build_object('id', 'a3', 'timestamp', '2026-04-11T05:51:30Z', 'gps_lat', 36.6594, 'gps_lng', -75.9095, 'anomaly_type', 'Unclassified large mammal', 'severity', 'low', 'description', 'Stationary in marsh. Fainter signature.', 'review_status', 'pending')
        )
      ),
      'deliverables_manifest', jsonb_build_object(
        'deliverables', jsonb_build_array(
          jsonb_build_object('filename', 'BBNWR_Census_Report_2026-04.pdf', 'type', 'Report', 'file_size', '2.4 MB'),
          jsonb_build_object('filename', 'BBNWR_Thermal_Video.zip', 'type', 'Video', 'file_size', '18.6 GB'),
          jsonb_build_object('filename', 'BBNWR_Detections.geojson', 'type', 'GeoJSON', 'file_size', '245 KB'),
          jsonb_build_object('filename', 'BBNWR_Heatmap_KDE.tif', 'type', 'GeoTIFF', 'file_size', '12 MB'),
          jsonb_build_object('filename', 'BBNWR_Transects.kml', 'type', 'KML', 'file_size', '18 KB'),
          jsonb_build_object('filename', 'BBNWR_FlightLogs.zip', 'type', 'Flight Logs', 'file_size', '8.2 MB')
        ),
        'delivery_method', 'Secure download link (30-day expiry)'
      ),
      'appendix_flight_logs', jsonb_build_object(
        'logs', jsonb_build_array(
          jsonb_build_object('flight_number', 1, 'duration', '46 min', 'max_altitude', '302 ft', 'max_distance', '1.8 mi', 'takeoff_gps', '36.6710, -75.9200'),
          jsonb_build_object('flight_number', 2, 'duration', '43 min', 'max_altitude', '301 ft', 'max_distance', '1.6 mi', 'takeoff_gps', '36.6710, -75.9200'),
          jsonb_build_object('flight_number', 3, 'duration', '52 min', 'max_altitude', '300 ft', 'max_distance', '2.1 mi', 'takeoff_gps', '36.6715, -75.9195'),
          jsonb_build_object('flight_number', 4, 'duration', '45 min', 'max_altitude', '303 ft', 'max_distance', '1.9 mi', 'takeoff_gps', '36.6715, -75.9195')
        ),
        'notes', 'All flights Part 107 compliant. RTK fix maintained. No incidents.'
      ),
      'appendix_raw_data', jsonb_build_object(
        'links', jsonb_build_array(
          jsonb_build_object('label', 'Thermal+RGB Video', 'url', '#', 'format', 'MP4/RJPEG', 'size', '18.6 GB'),
          jsonb_build_object('label', 'Detection GeoJSON', 'url', '#', 'format', 'GeoJSON', 'size', '245 KB'),
          jsonb_build_object('label', 'Heatmap GeoTIFF', 'url', '#', 'format', 'GeoTIFF', 'size', '12 MB'),
          jsonb_build_object('label', 'Flight Logs', 'url', '#', 'format', 'CSV', 'size', '8.2 MB')
        )
      )
    )
  WHERE id = '904a0dbf-b82e-4c8b-9df1-d6b1ab0da264';

  RAISE NOTICE 'Seeded: job=%, proc=%, report=904a0dbf', v_job_id, v_proc_id;
END $$;
