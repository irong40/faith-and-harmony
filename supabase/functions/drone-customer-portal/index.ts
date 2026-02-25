import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PortalRequest {
  action: 'validate' | 'get-download-url' | 'get-gallery' | 'get-model-url' | 'confirm-receipt';
  token: string;
  deliverable_id?: string;
  asset_type?: 'model' | 'ortho';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, token, deliverable_id } = await req.json() as PortalRequest;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find job by delivery token
    const { data: job, error: jobError } = await supabase
      .from('drone_jobs')
      .select(`
        id,
        job_number,
        property_address,
        property_city,
        property_state,
        property_type,
        status,
        delivered_at,
        download_url,
        delivery_drive_url,
        delivery_status,
        photogrammetry_status,
        model_file_path,
        orthophoto_path,
        package_id,
        customer_id,
        drone_packages:package_id (
          name,
          description,
          features
        ),
        customers:customer_id (
          name,
          company_name
        )
      `)
      .eq('delivery_token', token)
      .eq('status', 'delivered')
      .single();

    if (jobError || !job) {
      console.error('Job lookup error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired delivery token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle different actions
    if (action === 'validate') {
      // Get asset counts
      const { data: assets } = await supabase
        .from('drone_assets')
        .select('id, file_type, file_size')
        .eq('job_id', job.id);

      const photoCount = assets?.filter((a: any) => a.file_type === 'image').length || 0;
      const videoCount = assets?.filter((a: any) => a.file_type === 'video').length || 0;
      const totalSize = assets?.reduce((sum: number, a: any) => sum + (a.file_size || 0), 0) || 0;

      // Get deliverables
      const { data: deliverables } = await supabase
        .from('drone_deliverables')
        .select('id, name, description, file_count, total_size_bytes')
        .eq('job_id', job.id);

      console.log(`Portal validated for job ${job.job_number}`);

      return new Response(
        JSON.stringify({
          success: true,
          job: {
            id: job.id,
            job_number: job.job_number,
            property_address: job.property_address,
            property_city: job.property_city,
            property_state: job.property_state,
            property_type: job.property_type,
            delivered_at: job.delivered_at,
            package_name: job.drone_packages?.name || 'Standard Package',
            package_description: job.drone_packages?.description,
            package_features: job.drone_packages?.features || [],
            customer_name: job.customers?.name,
            company_name: job.customers?.company_name,
            photo_count: photoCount,
            video_count: videoCount,
            total_size_mb: Math.round(totalSize / (1024 * 1024) * 10) / 10,
            has_download_url: !!(job.download_url || job.delivery_drive_url),
            drive_url: job.delivery_drive_url || job.download_url || null,
            delivery_status: job.delivery_status,
            photogrammetry_status: job.photogrammetry_status,
            has_3d_model: !!job.model_file_path,
            has_ortho: !!job.orthophoto_path,
          },
          deliverables: deliverables || [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-download-url') {
      // Generate fresh signed URL for the main download
      if (job.download_url) {
        // If it's already a signed URL, try to extract the path and regenerate
        // Or just return the existing URL if it's still valid
        return new Response(
          JSON.stringify({
            success: true,
            download_url: job.download_url,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If no download URL, try to generate from deliverable
      if (deliverable_id) {
        const { data: deliverable } = await supabase
          .from('drone_deliverables')
          .select('download_url, file_paths')
          .eq('id', deliverable_id)
          .eq('job_id', job.id)
          .single();

        if (deliverable?.download_url) {
          return new Response(
            JSON.stringify({
              success: true,
              download_url: deliverable.download_url,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Generate signed URL for the first file path
        if (deliverable?.file_paths?.length > 0) {
          const { data: signedUrl } = await supabase.storage
            .from('drone-jobs')
            .createSignedUrl(deliverable.file_paths[0], 3600); // 1 hour

          if (signedUrl) {
            return new Response(
              JSON.stringify({
                success: true,
                download_url: signedUrl.signedUrl,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }

      return new Response(
        JSON.stringify({ error: 'No download available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-model-url') {
      const type = (await req.json() as any).asset_type || 'model'; // 'model' or 'ortho'

      const path = type === 'ortho' ? job.orthophoto_path : job.model_file_path;

      if (!path) {
        return new Response(
          JSON.stringify({ error: 'Asset not ready' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create signed URL from drone-processed-assets bucket
      const { data: signedUrl } = await supabase.storage
        .from('drone-processed-assets')
        .createSignedUrl(path, 3600); // 1 hour

      if (signedUrl) {
        return new Response(
          JSON.stringify({
            success: true,
            download_url: signedUrl.signedUrl,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Could not generate link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-gallery') {
      // Get processed assets for gallery preview
      const { data: assets } = await supabase
        .from('drone_assets')
        .select('id, file_name, file_path, processed_path, file_type, qa_score')
        .eq('job_id', job.id)
        .eq('file_type', 'image')
        .order('sort_order', { ascending: true })
        .limit(24);

      // Generate signed URLs for thumbnails
      const gallery = await Promise.all(
        (assets || []).map(async (asset: any) => {
          const path = asset.processed_path || asset.file_path;
          const { data: signedUrl } = await supabase.storage
            .from('drone-jobs')
            .createSignedUrl(path, 3600);

          return {
            id: asset.id,
            file_name: asset.file_name,
            qa_score: asset.qa_score,
            thumbnail_url: signedUrl?.signedUrl || null,
          };
        })
      );

      return new Response(
        JSON.stringify({
          success: true,
          gallery: gallery.filter((g: any) => g.thumbnail_url),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'confirm-receipt') {
      const { error: updateError } = await supabase
        .from('drone_jobs')
        .update({ delivery_status: 'delivery_confirmed' })
        .eq('id', job.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Could not confirm receipt' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Client confirmed receipt for job ${job.job_number}`);
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Portal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});