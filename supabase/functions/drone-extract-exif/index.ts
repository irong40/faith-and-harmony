import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ExifReader from "https://esm.sh/exifreader@4.14.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/**
 * Convert EXIF GPS coordinates to decimal degrees
 * EXIF stores GPS as "degrees, minutes, seconds" format
 */
function parseGPSCoordinate(gpsTag: unknown, refTag: unknown): number | null {
  try {
    if (!gpsTag || typeof gpsTag !== 'object') return null;
    
    const gps = gpsTag as { value?: number[][] | number[]; description?: string };
    
    // Try to use the description field which is often already in decimal
    if (gps.description) {
      const decimal = parseFloat(gps.description);
      if (!isNaN(decimal)) {
        const ref = (refTag as { value?: string[] })?.value?.[0] || '';
        return (ref === 'S' || ref === 'W') ? -decimal : decimal;
      }
    }
    
    // Parse from value array [[degrees, 1], [minutes, 1], [seconds, 100]]
    if (gps.value && Array.isArray(gps.value)) {
      let degrees = 0, minutes = 0, seconds = 0;
      
      if (Array.isArray(gps.value[0])) {
        // Format: [[d, denom], [m, denom], [s, denom]]
        degrees = (gps.value[0] as number[])[0] / ((gps.value[0] as number[])[1] || 1);
        minutes = (gps.value[1] as number[])[0] / ((gps.value[1] as number[])[1] || 1);
        seconds = (gps.value[2] as number[])[0] / ((gps.value[2] as number[])[1] || 1);
      } else {
        // Simple array format
        degrees = gps.value[0] as number;
        minutes = (gps.value[1] as number) || 0;
        seconds = (gps.value[2] as number) || 0;
      }
      
      let decimal = degrees + (minutes / 60) + (seconds / 3600);
      const ref = (refTag as { value?: string[] })?.value?.[0] || '';
      if (ref === 'S' || ref === 'W') decimal = -decimal;
      
      return decimal;
    }
    
    return null;
  } catch (e) {
    console.error("GPS parse error:", e);
    return null;
  }
}

/**
 * Parse EXIF date string to ISO format
 * EXIF format: "2024:01:15 14:30:00"
 */
function parseExifDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  
  try {
    // Replace date separators and parse
    const normalized = dateStr.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    const date = new Date(normalized);
    
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Parse GPS altitude from EXIF
 */
function parseAltitude(altTag: unknown, refTag: unknown): number | null {
  try {
    if (!altTag) return null;
    
    const alt = altTag as { value?: number | number[]; description?: string };
    let altitude: number | null = null;
    
    if (alt.description) {
      altitude = parseFloat(alt.description.replace(/[^\d.-]/g, ''));
    } else if (typeof alt.value === 'number') {
      altitude = alt.value;
    } else if (Array.isArray(alt.value)) {
      altitude = alt.value[0] / (alt.value[1] || 1);
    }
    
    if (altitude === null || isNaN(altitude)) return null;
    
    // Check altitude reference (0 = above sea level, 1 = below)
    const ref = (refTag as { value?: number })?.value;
    if (ref === 1) altitude = -altitude;
    
    return altitude;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { asset_id, job_id } = await req.json();

    // Batch mode: process all assets for a job
    if (job_id) {
      console.log(`Batch EXIF extraction for job: ${job_id}`);
      
      const { data: assets, error } = await supabase
        .from("drone_assets")
        .select("id, file_path, file_name, exif_data")
        .eq("job_id", job_id)
        .is("exif_data", null);

      if (error) throw error;

      let processed = 0;
      let failed = 0;

      for (const asset of assets || []) {
        try {
          const result = await processAsset(supabase, asset.id, asset.file_path, asset.file_name);
          if (result.success) processed++;
          else failed++;
        } catch (e) {
          console.error(`Failed to process asset ${asset.id}:`, e);
          failed++;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Processed ${processed} assets, ${failed} failed`,
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
      .select("id, file_path, file_name")
      .eq("id", asset_id)
      .single();

    if (assetError || !asset) {
      console.error("Asset not found:", assetError);
      return new Response(
        JSON.stringify({ error: "Asset not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await processAsset(supabase, asset.id, asset.file_path, asset.file_name);

    return new Response(
      JSON.stringify(result),
      { 
        status: result.success ? 200 : 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("EXIF extraction error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processAsset(
  supabase: ReturnType<typeof createClient>,
  assetId: string,
  filePath: string,
  fileName: string
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  console.log(`Processing EXIF for asset ${assetId}: ${fileName}`);

  // Skip non-image files
  const ext = fileName.toLowerCase().split('.').pop();
  if (!['jpg', 'jpeg', 'tiff', 'tif', 'heic', 'heif', 'dng', 'png', 'webp'].includes(ext || '')) {
    console.log(`Skipping non-image file: ${fileName}`);
    return { success: true, data: { skipped: true, reason: "Not an image file" } };
  }

  try {
    // Download the image
    console.log(`Downloading from: ${filePath}`);
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`Downloaded ${arrayBuffer.byteLength} bytes`);

    // Parse EXIF data
    const exifData = ExifReader.load(arrayBuffer, { expanded: true });
    console.log("EXIF parsed successfully");

    // Extract key fields
    const exif = exifData.exif || {};
    const gps = exifData.gps || {};
    
    // Camera model
    const make = (exifData.Make as { description?: string })?.description || 
                 (exif.Make as { description?: string })?.description || '';
    const model = (exifData.Model as { description?: string })?.description || 
                  (exif.Model as { description?: string })?.description || '';
    const cameraModel = [make, model].filter(Boolean).join(' ').trim() || null;

    // Capture date
    const dateTimeOriginal = (exif.DateTimeOriginal as { description?: string })?.description ||
                             (exifData.DateTimeOriginal as { description?: string })?.description;
    const captureDate = parseExifDate(dateTimeOriginal);

    // GPS coordinates
    const gpsLatitude = parseGPSCoordinate(gps.Latitude || exif.GPSLatitude, gps.LatitudeRef || exif.GPSLatitudeRef);
    const gpsLongitude = parseGPSCoordinate(gps.Longitude || exif.GPSLongitude, gps.LongitudeRef || exif.GPSLongitudeRef);
    const gpsAltitude = parseAltitude(gps.Altitude || exif.GPSAltitude, gps.AltitudeRef || exif.GPSAltitudeRef);

    // Build full EXIF JSON for storage (filtered to useful fields)
    const exifJson: Record<string, unknown> = {
      camera: {
        make,
        model,
        lens: (exif.LensModel as { description?: string })?.description,
      },
      capture: {
        dateTime: dateTimeOriginal,
        exposureTime: (exif.ExposureTime as { description?: string })?.description,
        fNumber: (exif.FNumber as { description?: string })?.description,
        iso: (exif.ISOSpeedRatings as { description?: string })?.description,
        focalLength: (exif.FocalLength as { description?: string })?.description,
        whiteBalance: (exif.WhiteBalance as { description?: string })?.description,
      },
      gps: gpsLatitude !== null ? {
        latitude: gpsLatitude,
        longitude: gpsLongitude,
        altitude: gpsAltitude,
      } : null,
      image: {
        width: (exifData.file?.ImageWidth as { value?: number })?.value || 
               (exif.PixelXDimension as { value?: number })?.value,
        height: (exifData.file?.ImageHeight as { value?: number })?.value || 
                (exif.PixelYDimension as { value?: number })?.value,
        orientation: (exif.Orientation as { description?: string })?.description,
      },
    };

    // Update the asset record
    const { error: updateError } = await supabase
      .from("drone_assets")
      .update({
        exif_data: exifJson,
        camera_model: cameraModel,
        capture_date: captureDate,
        gps_latitude: gpsLatitude,
        gps_longitude: gpsLongitude,
        gps_altitude: gpsAltitude,
      })
      .eq("id", assetId);

    if (updateError) {
      console.error("Failed to update asset:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`EXIF extracted for ${fileName}:`, {
      camera: cameraModel,
      date: captureDate,
      gps: gpsLatitude !== null ? `${gpsLatitude}, ${gpsLongitude}` : null,
      altitude: gpsAltitude,
    });

    return {
      success: true,
      data: {
        camera_model: cameraModel,
        capture_date: captureDate,
        gps_latitude: gpsLatitude,
        gps_longitude: gpsLongitude,
        gps_altitude: gpsAltitude,
        exif_data: exifJson,
      },
    };
  } catch (e) {
    console.error(`EXIF extraction failed for ${fileName}:`, e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
