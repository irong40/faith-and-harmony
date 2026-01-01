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

    // Fetch job with package info
    const { data: job, error: jobError } = await supabase
      .from("drone_jobs")
      .select(`
        *,
        drone_packages (*)
      `)
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all analyzed assets for this job
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
      ready_for_delivery: overallRecommendation === "deliver_as_planned"
    };

    // Update the job with batch summary
    const { error: updateError } = await supabase
      .from("drone_jobs")
      .update({
        qa_score: avgScore,
        qa_summary: batchSummary,
        status: hasCriticalFailures ? "revision" : "qa"
      })
      .eq("id", job_id);

    if (updateError) {
      console.error("Failed to update job:", updateError);
    }

    console.log("Batch QA complete for job:", job_id, "Score:", avgScore, "Recommendation:", overallRecommendation);

    // Trigger n8n processing webhook if configured and QA passes
    const n8nWebhookUrl = Deno.env.get("N8N_PROCESSING_WEBHOOK_URL");
    
    if (n8nWebhookUrl && overallRecommendation === "deliver_as_planned") {
      console.log("Triggering n8n processing webhook for job:", job_id);
      
      // Fetch customer info for the webhook
      const { data: customer } = await supabase
        .from("customers")
        .select("email, name")
        .eq("id", job.customer_id)
        .single();

      // Non-blocking webhook call
      fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job_id,
          job_number: job.job_number,
          package_code: pkg?.code,
          package_name: pkg?.name,
          processing_profile: pkg?.processing_profile,
          edit_budget_minutes: pkg?.edit_budget_minutes,
          property_address: job.property_address,
          property_city: job.property_city,
          scheduled_date: job.scheduled_date,
          total_photos: assets.length,
          asset_paths: assets.map((a: any) => a.file_path),
          customer_email: customer?.email,
          customer_name: customer?.name,
          qa_score: avgScore,
          supabase_url: SUPABASE_URL
        })
      }).then(() => {
        console.log("n8n webhook triggered successfully");
      }).catch(err => {
        console.error("n8n webhook failed:", err);
      });
    } else if (!n8nWebhookUrl) {
      console.log("N8N_PROCESSING_WEBHOOK_URL not configured - skipping processing webhook");
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_id,
        qa_score: avgScore,
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
