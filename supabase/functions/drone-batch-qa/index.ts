import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface BatchQARequest {
  job_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json() as BatchQARequest;

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "job_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch job with package and customer info
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select(`
        *,
        drone_packages (*),
        customers (*)
      `)
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all analyzed assets for this job (including compass_direction for construction labeling)
    const { data: assets, error: assetsError } = await supabase
      .from("drone_assets")
      .select("*")
      .eq("job_id", job_id)
      .not("qa_results", "is", null)
      .order("sort_order");

    if (assetsError) {
      console.error("Failed to fetch assets:", assetsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch assets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ error: "No analyzed assets found for this job" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pkg = job.drone_packages;
    const customer = job.customers;
    const expectedShots = pkg?.shot_manifest || [];

    // Calculate batch summary
    let passCount = 0;
    let warningCount = 0;
    let failCount = 0;
    let totalFixTime = 0;
    let totalFixCost = 0;
    const reshootShots: any[] = [];
    const detectedShotTypes: string[] = [];
    const commonIssues: Record<string, number> = {};

    assets.forEach((asset: any, index: number) => {
      const qa = asset.qa_results;
      if (!qa) return;

      // Count by recommendation
      switch (qa.recommendation) {
        case "pass": passCount++; break;
        case "warning": warningCount++; break;
        case "fail": failCount++; break;
      }

      // Track shot types
      if (qa.shot_classification?.type) {
        detectedShotTypes.push(qa.shot_classification.type);
      }

      // Accumulate fix times and costs
      if (qa.issues) {
        qa.issues.forEach((issue: any) => {
          if (issue.estimated_fix_time_minutes) {
            totalFixTime += issue.estimated_fix_time_minutes;
          }
          if (issue.estimated_fix_cost) {
            totalFixCost += issue.estimated_fix_cost;
          }

          // Track common issues for batch correction
          if (issue.category === "white_balance" && issue.severity !== "critical") {
            commonIssues["white_balance"] = (commonIssues["white_balance"] || 0) + 1;
          }

          // Track reshoots
          if (issue.recommended_action === "reshoot") {
            reshootShots.push({
              photo_number: index + 1,
              shot_type: qa.shot_classification?.type || "unknown",
              reason: issue.description
            });
          }
        });
      }
    });

    // Check for missing required shots
    const missingShots = expectedShots.filter((shot: string) => !detectedShotTypes.includes(shot));
    const unexpectedShots = detectedShotTypes.filter((shot: string) => !expectedShots.includes(shot));

    // Calculate batch corrections (more efficient than individual fixes)
    const commonCorrections: any[] = [];
    Object.entries(commonIssues).forEach(([type, count]) => {
      if (count >= 3) {
        // Batch correction is efficient for 3+ photos with same issue
        commonCorrections.push({
          correction_type: type,
          affected_photo_count: count,
          batch_fix_time_minutes: type === "white_balance" ? 3 : 5, // Batch is more efficient
          note: `${count} photos have ${type.replace("_", " ")} issue - single batch adjustment recommended`
        });
      }
    });

    // Determine overall recommendation
    const editBudget = pkg?.edit_budget_minutes || 60;
    const exceedsBudget = totalFixTime > editBudget;
    const hasCriticalFailures = failCount > 0;
    const needsReshoot = reshootShots.length > 0;
    const packageIncomplete = missingShots.length > 0;
    
    // Check if this is a Premium package requiring sky replacement review
    const processingProfile = pkg?.processing_profile as { sky_replacement?: { enabled: boolean; review_gate: boolean } } | null;
    const needsSkyReview = processingProfile?.sky_replacement?.enabled && processingProfile?.sky_replacement?.review_gate;

    let overallRecommendation: string;
    let recommendationDetails: string;

    if (failCount >= assets.length / 2) {
      overallRecommendation = "full_reshoot";
      recommendationDetails = `${failCount} of ${assets.length} photos failed quality checks. Full reshoot recommended.`;
    } else if (needsReshoot) {
      overallRecommendation = "partial_reshoot";
      recommendationDetails = `${reshootShots.length} photo(s) require reshoot. ${packageIncomplete ? `Also missing: ${missingShots.join(", ")}.` : ""}`;
    } else if (packageIncomplete) {
      overallRecommendation = "incomplete_package";
      recommendationDetails = `Missing required shots: ${missingShots.join(", ")}. Schedule pickup shoot.`;
    } else if (exceedsBudget) {
      overallRecommendation = "extended_processing";
      recommendationDetails = `Estimated fix time (${totalFixTime} min) exceeds package budget (${editBudget} min). Approval needed for extended processing.`;
    } else {
      overallRecommendation = "deliver_as_planned";
      recommendationDetails = `All ${passCount + warningCount} photos pass quality standards. Ready for standard processing workflow.`;
    }

    // Calculate average score
    const avgScore = Math.round(assets.reduce((sum: number, a: any) => sum + (a.qa_score || 0), 0) / assets.length);

    // Build batch summary
    const batchSummary = {
      total_photos: assets.length,
      pass_count: passCount,
      warning_count: warningCount,
      fail_count: failCount,
      total_estimated_fix_time_minutes: totalFixTime,
      total_estimated_fix_cost: Math.round(totalFixCost * 100) / 100,
      package_edit_budget_minutes: editBudget,
      exceeds_package_budget: exceedsBudget,
      budget_overage_minutes: exceedsBudget ? totalFixTime - editBudget : 0,
      reshoot_required: needsReshoot,
      reshoot_count: reshootShots.length,
      reshoot_shots: reshootShots,
      package_name: pkg?.name || "Unknown",
      package_complete: !packageIncomplete,
      required_shot_types: expectedShots,
      missing_required_shots: missingShots,
      unexpected_shots: unexpectedShots.length > 0 ? unexpectedShots : undefined,
      common_corrections: commonCorrections,
      systematic_problems: commonCorrections.length > 0 
        ? `Batch corrections available for ${commonCorrections.map(c => c.correction_type).join(", ")}`
        : undefined,
      overall_recommendation: overallRecommendation,
      recommendation_details: recommendationDetails,
      ready_for_delivery: overallRecommendation === "deliver_as_planned",
      needs_sky_review: needsSkyReview,
    };

    // Determine job status based on results
    let newStatus: string;
    if (hasCriticalFailures) {
      newStatus = "revision";
    } else if (needsSkyReview && overallRecommendation === "deliver_as_planned") {
      // Premium packages go to review_pending for sky replacement review
      newStatus = "review_pending";
    } else {
      newStatus = "qa";
    }

    // Update the job with batch summary
    const { error: updateError } = await supabase
      .from("drone_jobs")
      .update({
        qa_score: avgScore,
        qa_summary: batchSummary,
        status: newStatus
      })
      .eq("id", job_id);

    if (updateError) {
      console.error("Failed to update job:", updateError);
    }

    console.log("Batch QA complete for job:", job_id, "Score:", avgScore, "Recommendation:", overallRecommendation, "Status:", newStatus);

    // Trigger n8n processing webhook if configured and QA passes (not review_pending)
    const n8nWebhookUrl = Deno.env.get("N8N_PROCESSING_WEBHOOK_URL");
    
    if (n8nWebhookUrl && overallRecommendation === "deliver_as_planned" && newStatus !== "review_pending") {
      console.log("Triggering n8n processing webhook for job:", job_id);

      // Build asset data with compass directions for construction labeling
      const assetData = assets.map((a: any) => ({
        id: a.id,
        file_name: a.file_name,
        file_path: a.file_path,
        compass_direction: a.compass_direction,
        capture_date: a.capture_date,
        qa_score: a.qa_score,
      }));

      // Non-blocking webhook call with full project/client info
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job_id,
          job_number: job.job_number,
          project_name: job.property_address, // n8n expects project_name
          property_address: job.property_address,
          property_city: job.property_city,
          property_state: job.property_state,
          package_code: pkg?.code,
          package_name: pkg?.name,
          processing_profile: pkg?.processing_profile,
          edit_budget_minutes: pkg?.edit_budget_minutes,
          scheduled_date: job.scheduled_date,
          total_photos: assets.length,
          assets: assetData,
          asset_paths: assets.map((a: any) => a.file_path),
          compass_directions: assets.map((a: any) => a.compass_direction), // For construction labeling
          client_email: customer?.email,
          client_name: customer?.name,
          client_phone: customer?.phone,
          qa_score: avgScore,
          supabase_url: SUPABASE_URL
        })
      }).then(() => {
        console.log("n8n webhook triggered successfully");
      }).catch(err => {
        console.error("n8n webhook failed:", err);
      });
    } else if (newStatus === "review_pending") {
      console.log("Job set to review_pending - awaiting admin approval before processing");
      
      // Optionally trigger a review notification
      const reviewNotificationUrl = Deno.env.get("REVIEW_NOTIFICATION_WEBHOOK_URL");
      if (reviewNotificationUrl) {
        fetch(reviewNotificationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            job_id: job_id,
            job_number: job.job_number,
            project_name: job.property_address,
            package_name: pkg?.name,
            total_photos: assets.length,
            qa_score: avgScore,
          })
        }).catch(err => console.error("Review notification failed:", err));
      }
    } else if (!n8nWebhookUrl) {
      console.log("N8N_PROCESSING_WEBHOOK_URL not configured - skipping processing webhook");
    }

    const n8nTriggered = !!(n8nWebhookUrl && overallRecommendation === "deliver_as_planned" && newStatus !== "review_pending");

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        qa_score: avgScore,
        status: newStatus,
        n8n_triggered: n8nTriggered,
        summary: batchSummary
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Batch QA error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
