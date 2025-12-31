import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// 1x1 transparent GIF
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
  0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
  0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b
]);

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const trackingId = url.searchParams.get('t');
    const action = url.searchParams.get('a') || 'open';
    
    if (!trackingId) {
      console.log('No tracking ID provided');
      return new Response(TRACKING_PIXEL, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' },
      });
    }

    console.log(`Tracking event: ${action} for ${trackingId}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current tracking record
    const { data: record, error: fetchError } = await supabase
      .from('email_tracking')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    if (fetchError || !record) {
      console.log('Tracking record not found:', trackingId);
      return new Response(TRACKING_PIXEL, {
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-cache, no-store' },
      });
    }

    const now = new Date().toISOString();
    
    if (action === 'open') {
      // Update open tracking
      const updateData: any = {
        open_count: (record.open_count || 0) + 1,
      };
      
      // Only set opened_at on first open
      if (!record.opened_at) {
        updateData.opened_at = now;
      }

      await supabase
        .from('email_tracking')
        .update(updateData)
        .eq('id', record.id);

      console.log(`Open tracked for ${trackingId}, count: ${updateData.open_count}`);
      
    } else if (action === 'click') {
      // Update click tracking
      const updateData: any = {
        click_count: (record.click_count || 0) + 1,
      };
      
      // Only set clicked_at on first click
      if (!record.clicked_at) {
        updateData.clicked_at = now;
      }

      await supabase
        .from('email_tracking')
        .update(updateData)
        .eq('id', record.id);

      console.log(`Click tracked for ${trackingId}, count: ${updateData.click_count}`);
      
      // Redirect to website
      const redirectUrl = url.searchParams.get('url') || 'https://faithandharmonyllc.com';
      return new Response(null, {
        status: 302,
        headers: { 'Location': redirectUrl },
      });
    }

    // Return tracking pixel for open events
    return new Response(TRACKING_PIXEL, {
      headers: { 
        'Content-Type': 'image/gif', 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

  } catch (error: any) {
    console.error('Error in track-email:', error);
    // Always return the pixel to avoid breaking emails
    return new Response(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif' },
    });
  }
});
