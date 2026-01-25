import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// The comprehensive QA prompt from the specification
const SYSTEM_PROMPT = `# Aerial Photography Quality Analysis System Prompt

# ROLE & PURPOSE

You are an expert aerial photography quality analyst for a professional real estate and construction drone photography business operating in Hampton Roads, Virginia. Your role is to analyze drone photographs and identify technical issues that would make them unsuitable for client delivery or require corrective action.

You must be thorough but economically rational - your analysis directly impacts business profitability. Minor issues correctable within standard post-processing budgets should be flagged but not cause failures. Focus on issues that would be visible to clients, require re-shooting, or exceed package editing budgets.

# Critical Requirements:
- Always respond with valid JSON matching the specified TypeScript schema
- Do not include any text outside the JSON response
- Base severity decisions on fix time and cost, not subjective quality opinions
- Consider package type and business economics in all recommendations

# BUSINESS CONTEXT

Market: Hampton Roads, Virginia - real estate and construction drone photography
Primary Services: Residential real estate marketing, commercial property marketing, construction progress documentation
Turnaround Standard: 24-48 hours from shoot completion
Dispatch Cost: $300 minimum for reshoots
Post-Processing Rate: $100/hour (photos), $125/hour (video)

# Package Economics
const PACKAGE_BUDGETS = {
  basic_residential: { price: 495, photo_edit_minutes: 30, reshoot_tolerance: 'low' },
  standard_residential: { price: 795, photo_edit_minutes: 60, reshoot_tolerance: 'medium' },
  premium_residential: { price: 1250, photo_edit_minutes: 90, reshoot_tolerance: 'high' },
  construction_progress: { price: 800, photo_edit_minutes: 45, reshoot_tolerance: 'critical_only', consistency_required: true }
};

# Cost-Based Decision Thresholds
auto_fix_threshold: 45 minutes - Under 45 min total: always fix in post
reshoot_consideration: 90 minutes - 45-90 min: context-dependent decision
reshoot_trigger: $300 - Fix cost approaching $300: reshoot preferred

# Fix Time Estimates
- horizon_under_2deg: 0.5 minutes
- horizon_2_to_5deg: 2 minutes
- horizon_over_5deg: 8 minutes
- color_cast_mild: 2 minutes (batch if multiple photos)
- color_cast_severe: 8 minutes
- exposure_1_stop: 3 minutes (recoverable)
- exposure_2_stop: 12 minutes (may not succeed)
- distraction_small: 5 minutes (clone/patch)
- distraction_large: 15 minutes (complex masking)
- sharpening_mild: 3 minutes
- composition_recrop: 2 minutes

# ANALYSIS CRITERIA

## 1. HORIZON & LEVELING
Critical for real estate marketing; less critical for construction documentation.
- Analyze: Is the horizon level? Measure tilt in degrees if visible.
- For oblique shots: Is the camera angle consistent and intentional?
- For nadir (top-down) shots: Are building edges parallel to frame edges?

Severity:
- < 2 degrees: minor, fix_time 0.5 min, action: fix_in_post
- 2-5 degrees: minor, fix_time 2 min, action: fix_in_post
- > 5 degrees: major, fix_time 8 min, action: package === 'premium' ? reshoot : fix_in_post

## 2. SHARPNESS & FOCUS
Critical for all package types - unfixable in post-processing.
- Is the primary subject in sharp focus?
- Is there motion blur from drone movement?
- Is there camera shake or vibration blur?

Severity:
- severe_blur + primary_subject_out_of_focus: critical, unfixable, action: reshoot
- moderate_blur + sharpening_may_help: major, fix_time 3 min, 70% success rate

## 3. EXPOSURE & LIGHTING
High priority for real estate marketing; moderate for construction.
- Is the image properly exposed?
- Blown highlights (pure white areas)?
- Crushed shadows (pure black areas)?
- Overall under/overexposure (measure in stops)?

Severity:
- > 2 stops + detail_loss_critical: critical, action: reshoot
- 1-2 stops: major, fix_time 12 min, 80% success rate
- < 1 stop: minor, fix_time 3 min, action: fix_in_post

## 4. WHITE BALANCE & COLOR
Important for all packages; batch correction more efficient.
- Does the color temperature look natural?
- Is there an unwanted color cast (too blue, too orange, too green)?

Special Rule - Batch Detection: If multiple photos have same color cast direction, recommend batch correction.

## 5. COMPOSITION & FRAMING
High priority for real estate; moderate for construction.
- Is the main subject well-positioned in the frame?
- Are there distracting elements (other properties, vehicles, people, trash)?
- Does shot match expected type from package requirements?

Severity:
- wrong_shot_type or subject_not_in_frame: critical, action: reshoot
- large_distractions + premium: major, fix_time 15 min
- small_distractions: minor, fix_time 5 min

## 6. TECHNICAL ISSUES
- Lens flare or sun glare?
- Propeller shadows or reflections visible?
- Sensor dust spots?
- Chromatic aberration on high-contrast edges?

Severity:
- propeller_in_frame or severe_flare: critical, action: reshoot
- dust_spots or mild_chromatic_aberration: minor, fix_time 3 min

# SHOT CLASSIFICATION

Classify each image as one of:

Real Estate Residential:
- front_hero_oblique: Primary marketing shot, 45° angle showing full facade and roofline
- front_left_corner, front_right_corner: Corner perspectives
- rear_oblique: Back of property at 45° angle
- side_elevation: Profile view
- top_down_property: Nadir shot showing entire lot
- top_down_roof: Nadir shot focused on roof detail
- neighborhood_context: Wide shot showing surrounding area
- feature_detail: Close-up of pool, dock, patio, landscaping
- approach_shot: Street view approaching property
- reveal_frame, orbit_frame: Still frames from video clips

Real Estate Commercial:
- building_hero_oblique, parking_entrance, building_perimeter, site_context, signage_detail

Construction Progress:
- construction_corner_N/E/S/W: Corner views from compass bearings
- construction_perimeter, construction_nadir, construction_workface, staging_logistics

# SCORING WEIGHTS

Real Estate (Residential & Commercial):
- composition: 25%, lighting_exposure: 25%, sharpness: 20%, white_balance: 15%, horizon_level: 15%
- pass_threshold: 80

Construction Progress:
- sharpness: 30%, consistency: 25%, horizon_level: 20%, exposure: 15%, composition: 10%
- pass_threshold: 70

# RESPONSE SCHEMA

Return ONLY valid JSON matching this structure:

{
  "metadata": {
    "analysis_version": "2.0",
    "analysis_timestamp": "ISO 8601 timestamp",
    "model_name": "gemini-1.5-pro-latest",
    "processing_time_ms": number
  },
  "overall_score": number (0-100),
  "recommendation": "pass" | "warning" | "fail",
  "ready_for_delivery": boolean,
  "shot_classification": {
    "type": "shot_type_from_list",
    "confidence": number (0-100),
    "matches_expected": boolean,
    "compass_bearing": "N" | "E" | "S" | "W" | null,
    "notes": "string"
  },
  "issues": [
    {
      "category": "horizon" | "sharpness" | "exposure" | "white_balance" | "composition" | "technical",
      "severity": "critical" | "major" | "minor" | "suggestion",
      "description": "string",
      "correctable_in_post": boolean,
      "estimated_fix_time_minutes": number | null,
      "estimated_fix_cost": number | null,
      "fix_success_rate": number (0-1) | null,
      "recommended_action": "fix_in_post" | "reshoot" | "client_decision" | "accept_as_is",
      "action_reason": "string",
      "cost_justification": "string",
      "client_facing_description": "string" (optional)
    }
  ],
  "analysis": {
    "horizon": { "level": boolean, "tilt_degrees": number | null, "notes": "string" },
    "sharpness": { "score": number, "focus_accurate": boolean, "motion_blur": boolean, "notes": "string" },
    "exposure": { "score": number, "blown_highlights": boolean, "crushed_shadows": boolean, "stops_off": number | null, "notes": "string" },
    "white_balance": { "score": number, "color_cast": "none" | "warm" | "cool" | "green" | "magenta", "notes": "string" },
    "composition": { "score": number, "subject_placement": "good" | "acceptable" | "poor", "distractions": boolean, "notes": "string" }
  },
  "consistency_check": {
    "reference_photo_date": "string" | null,
    "angle_match_score": number | null,
    "altitude_match_score": number | null,
    "overall_consistency": "excellent" | "acceptable" | "poor" | null,
    "notes": "string"
  } (optional, only for construction),
  "highlights": "string (1-2 sentences on what's good)",
  "summary": "string (1-2 sentences overall assessment)"
}

# FINAL REMINDERS
1. Always output valid JSON - no markdown, no explanatory text, just the JSON object
2. Base decisions on economics - fix time, fix cost, package budget, reshoot cost
3. Consider package type - Premium has higher standards, Construction values consistency
4. Apply batch intelligence - downgrade severity when batch correction is efficient
5. Be construction-aware - consistency checks are critical, aesthetics less so
6. Provide actionable recommendations - every issue needs a clear action path
7. Think like a business - your analysis directly impacts profitability

Begin analysis.`;

interface AnalyzeRequest {
  asset_id: string;
  job_id?: string;
}

interface QualityIssue {
  category: string;
  severity: string;
  description: string;
  estimated_fix_time_minutes: number;
}

interface QAResults {
  issues: QualityIssue[];
  overall_score: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { asset_id, job_id } = await req.json() as AnalyzeRequest;

    if (!asset_id) {
      return new Response(
        JSON.stringify({ error: "asset_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the asset with job and package info
    const { data: asset, error: assetError } = await supabase
      .from("drone_assets")
      .select(`
        *,
        drone_jobs (
          *,
          drone_packages (*),
          customers (name, qa_threshold_adjustment, historical_qa_overrides, qa_specific_requirements)
        )
      `)
      .eq("id", asset_id)
      .single();

    if (assetError || !asset) {
      console.error("Asset fetch error:", assetError);
      return new Response(
        JSON.stringify({ error: "Asset not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update asset status to analyzing
    await supabase
      .from("drone_assets")
      .update({ qa_status: "analyzing" })
      .eq("id", asset_id);

    const job = asset.drone_jobs;
    const pkg = job?.drone_packages;
    const customer = job?.customers;

    // file_path is already a public URL, use it directly
    const imageUrl = asset.file_path;
    if (!imageUrl) {
      console.error("No file_path for asset");
      return new Response(
        JSON.stringify({ error: "Could not access image file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Using image URL:", imageUrl);

    // Build batch context from previously analyzed assets in this job
    let batchContext = null;
    if (job) {
      const { data: analyzedAssets } = await supabase
        .from("drone_assets")
        .select("qa_results, qa_score")
        .eq("job_id", job.id)
        .neq("id", asset_id)
        .not("qa_results", "is", null);

      if (analyzedAssets && analyzedAssets.length > 0) {
        const commonIssues: string[] = [];
        let totalEditTime = 0;

        analyzedAssets.forEach((a: any) => {
          const results = a.qa_results as unknown as QAResults;

          if (results?.issues) {
            results.issues.forEach((issue) => {
              if (issue.category === "white_balance" && issue.description?.includes("color cast")) {
                if (!commonIssues.includes("color_cast")) commonIssues.push("color_cast");
              }
              if (issue.estimated_fix_time_minutes) {
                totalEditTime += issue.estimated_fix_time_minutes;
              }
            });
          }
        });

        batchContext = {
          photos_analyzed: analyzedAssets.length,
          common_issues: commonIssues,
          edit_budget_used_minutes: totalEditTime,
          edit_budget_remaining_minutes: (pkg?.edit_budget_minutes || 60) - totalEditTime
        };
      }
    }

    // Build the user prompt with context
    const userPrompt = `PROPERTY CONTEXT:
- Address: ${job?.property_address || "Unknown"}
- Property Type: ${job?.property_type || "residential"}
- Package: ${pkg?.name || "Standard"} ($${pkg?.price || 795})
- Package Category: ${pkg?.category === "construction" ? "construction_progress" : pkg?.reshoot_tolerance === "high" ? "premium" : pkg?.reshoot_tolerance === "low" ? "basic" : "standard"}
- Expected Shots: ${JSON.stringify(pkg?.shot_manifest || [])}

${batchContext ? `BATCH CONTEXT:
- Photos Analyzed: ${batchContext.photos_analyzed}
- Edit Budget Used: ${batchContext.edit_budget_used_minutes} minutes
- Edit Budget Remaining: ${batchContext.edit_budget_remaining_minutes} minutes
- Common Issues: ${batchContext.common_issues.join(", ") || "None detected"}` : ""}

${customer ? `CLIENT HISTORY:
- Historical Overrides: ${customer.historical_qa_overrides || 0}
- Threshold Adjustment: ${customer.qa_threshold_adjustment || 0}
- Specific Requirements: ${customer.qa_specific_requirements?.join(", ") || "None"}` : ""}

${job?.construction_context ? `CONSTRUCTION CONTEXT:
- Previous Shoot Date: ${job.construction_context.previous_shoot_date || "N/A"}
- Required Compass Angles: ${job.construction_context.required_compass_angles?.join(", ") || "N/A"}` : ""}

Analyze this aerial photograph and return the quality assessment JSON.`;

    console.log("Calling Google Gemini for QA analysis...");
    const startTime = Date.now();

    // Fetch image as base64 or buffer for Gemini
    let imageBuffer: ArrayBuffer;
    let mimeType: string;
    try {
      console.log("Fetching image from:", imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
      }
      imageBuffer = await imageResponse.arrayBuffer();
      console.log("Image size:", imageBuffer.byteLength, "bytes");

      if (imageBuffer.byteLength > 25 * 1024 * 1024) {
        throw new Error(`Image too large (${(imageBuffer.byteLength / 1024 / 1024).toFixed(1)}MB). Max 25MB. Please upload a compressed JPEG.`);
      }

      // Use raw buffer for upload
      mimeType = (asset.file_name || 'image.jpg').toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      console.log("Image fetched, size:", imageBuffer.byteLength);
    } catch (fetchError) {
      console.error("Image fetch error:", fetchError);
      await supabase.from("drone_assets").update({ qa_status: "pending" }).eq("id", asset_id);
      return new Response(
        JSON.stringify({ error: `Image processing failed: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Upload the file to Gemini File API
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GOOGLE_API_KEY}`;

    // We need to send the metadata and the file. 
    // For simplicity with standard fetch, we'll try the simple upload method or multipart.
    // However, the simplest way for a single file is often just POSTing the bytes if we can trigger the right "uploadType=media" flow,
    // but Gemini usually requires a specific protocol.
    // A reliable way is to do a multipart/related request or just a standard upload with metadata.
    // Let's use the standard "uploadType=media" with the correct headers if supported, or the resumable protocol.
    // Actually, the Gemini API docs suggest:
    // POST https://generativelanguage.googleapis.com/upload/v1beta/files?key=...
    // Body: JSON { file: { display_name: "..." } } returns an upload_url? No, that's slightly different.

    // Let's try the simplest approach: POST raw bytes with header X-Goog-Upload-Command: start, upload, finalize
    // Or check if there is a simpler "media" upload type.
    // Docs: POST /upload/v1beta/files?key=...
    // Headers: X-Goog-Upload-Protocol: raw, Content-Type: <mime-type>, Content-Length: <size>, X-Goog-Upload-Header-Content-Meta-Data: {"displayName": "..."}

    // We will use the REST API "media" upload if available, but the documentation points to `upload/v1beta/files`

    console.log("Uploading to Gemini File API...");

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "raw",
        "X-Goog-Upload-Command": "start, upload, finalize",
        "X-Goog-Upload-Header-Content-Length": imageBuffer.byteLength.toString(),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": mimeType,
      },
      body: imageBuffer // Send raw bytes
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Gemini File Upload failed: ${uploadResponse.status} ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileUri = uploadResult.file?.uri;

    if (!fileUri) {
      throw new Error("Gemini File Upload returned no URI");
    }

    console.log("File uploaded successfully. URI:", fileUri);

    // 2. Generate Content using the File URI
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: userPrompt },
                { fileData: { fileUri: fileUri, mimeType: mimeType } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          }
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Revert status on error
      await supabase
        .from("drone_assets")
        .update({ qa_status: "pending" })
        .eq("id", asset_id);

      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const processingTime = Date.now() - startTime;

    console.log("AI response received in", processingTime, "ms");

    // Parse the AI response (Gemini format)
    let qaResults;
    try {
      const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error("No content in AI response");
      }

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        qaResults = JSON.parse(jsonMatch[0]);
      } else {
        qaResults = JSON.parse(content);
      }

      // Add processing time if not present
      if (qaResults.metadata) {
        qaResults.metadata.processing_time_ms = processingTime;
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("Raw content:", aiData.choices?.[0]?.message?.content);

      // Create a fallback response
      qaResults = {
        metadata: {
          analysis_version: "2.0",
          analysis_timestamp: new Date().toISOString(),
          model_name: "gemini-1.5-pro-latest",
          processing_time_ms: processingTime,
          parse_error: true
        },
        overall_score: 50,
        recommendation: "warning",
        ready_for_delivery: false,
        shot_classification: {
          type: "unknown",
          confidence: 0,
          matches_expected: false,
          notes: "AI response could not be parsed"
        },
        issues: [{
          category: "technical",
          severity: "major",
          description: "AI analysis response could not be parsed",
          correctable_in_post: false,
          recommended_action: "client_decision",
          action_reason: "Manual review required"
        }],
        analysis: {
          horizon: { level: true, tilt_degrees: null, notes: "Could not analyze" },
          sharpness: { score: 50, focus_accurate: true, motion_blur: false, notes: "Could not analyze" },
          exposure: { score: 50, blown_highlights: false, crushed_shadows: false, stops_off: null, notes: "Could not analyze" },
          white_balance: { score: 50, color_cast: "none", notes: "Could not analyze" },
          composition: { score: 50, subject_placement: "acceptable", distractions: false, notes: "Could not analyze" }
        },
        highlights: "Automated analysis incomplete.",
        summary: "AI analysis could not be completed. Manual review recommended."
      };
    }

    // Determine QA status based on recommendation
    let qaStatus: string;
    switch (qaResults.recommendation) {
      case "pass":
        qaStatus = "passed";
        break;
      case "fail":
        qaStatus = "failed";
        break;
      default:
        qaStatus = "warning";
    }

    // Update the asset with QA results
    const { error: updateError } = await supabase
      .from("drone_assets")
      .update({
        qa_status: qaStatus,
        qa_results: qaResults,
        qa_score: qaResults.overall_score,
        qa_analyzed_at: new Date().toISOString()
      })
      .eq("id", asset_id);

    if (updateError) {
      console.error("Failed to update asset:", updateError);
    }

    // Update job batch context
    if (job) {
      const newBatchContext = {
        ...job.qa_batch_context,
        last_analyzed_asset: asset_id,
        last_analysis_time: new Date().toISOString(),
        total_analyzed: (job.qa_batch_context?.total_analyzed || 0) + 1
      };

      await supabase
        .from("drone_jobs")
        .update({ qa_batch_context: newBatchContext })
        .eq("id", job.id);
    }

    console.log("QA analysis complete for asset:", asset_id, "Score:", qaResults.overall_score);

    return new Response(
      JSON.stringify({
        success: true,
        asset_id,
        qa_status: qaStatus,
        qa_score: qaResults.overall_score,
        qa_results: qaResults
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("QA analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
