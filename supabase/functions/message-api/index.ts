import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitMessageRequest {
  conversation_id?: string;
  customer_email: string;
  customer_name: string;
  subject?: string;
  content: string;
  app_code?: string;
}

interface GetMessagesRequest {
  user_email: string;
}

interface MarkReadRequest {
  message_ids: string[];
}

// Authenticate the caller from the Authorization header and return the
// Supabase user, or null if the token is missing/invalid. get-messages and
// mark-read return per-user private data, so they must never trust a
// body-supplied email/id — identity comes from the verified JWT only.
// (submit-message remains public intake and does not use this.)
async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) return null;
  return user;
}

function unauthorized(): Response {
  return new Response(
    JSON.stringify({ error: "Authentication required" }),
    { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );
}

serve(async (req: Request): Promise<Response> => {
  console.log("Message API called:", req.method, req.url);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    if (req.method === "POST" && action === "submit-message") {
      const body: SubmitMessageRequest = await req.json();
      console.log("Submit message request:", body);

      let conversationId = body.conversation_id;

      // If no conversation_id, create a new conversation
      if (!conversationId) {
        // Get app_id from app_code if provided
        let appId = null;
        if (body.app_code) {
          const { data: app } = await supabase
            .from("apps")
            .select("id")
            .eq("code", body.app_code)
            .single();
          appId = app?.id;
        }

        const { data: conversation, error: convError } = await supabase
          .from("conversations")
          .insert({
            customer_email: body.customer_email,
            customer_name: body.customer_name,
            subject: body.subject || "New Message",
            app_id: appId,
          })
          .select()
          .single();

        if (convError) {
          console.error("Error creating conversation:", convError);
          throw convError;
        }

        conversationId = conversation.id;
        console.log("Created new conversation:", conversationId);
      }

      // Insert the message
      const { data: message, error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_type: "user",
          sender_name: body.customer_name,
          content: body.content,
        })
        .select()
        .single();

      if (msgError) {
        console.error("Error creating message:", msgError);
        throw msgError;
      }

      console.log("Message created:", message.id);

      // Create notification for admin
      const { error: notifError } = await supabase.from("notifications").insert({
        user_email: "info@faithandharmonyllc.com",
        type: "message",
        title: `New message from ${body.customer_name}`,
        body: body.content.substring(0, 100) + (body.content.length > 100 ? "..." : ""),
        link: `/admin/messages?conversation=${conversationId}`,
      });

      if (notifError) {
        console.error("Error creating notification:", notifError);
      }

      // Trigger email notification
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-message-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            type: "new_user_message",
            conversation_id: conversationId,
            sender_name: body.customer_name,
            sender_email: body.customer_email,
            content: body.content,
            subject: body.subject || "New Message",
          }),
        });
        console.log("Email notification response:", emailResponse.status);
      } catch (emailError) {
        console.error("Error sending email notification:", emailError);
      }

      return new Response(
        JSON.stringify({ success: true, conversation_id: conversationId, message }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (req.method === "POST" && action === "get-messages") {
      // Identity comes from the caller's JWT, not the request body (IDOR fix)
      const user = await getAuthenticatedUser(req);
      if (!user?.email) return unauthorized();

      const body: GetMessagesRequest = await req.json();

      // Reject explicit mismatches so a buggy caller fails loudly instead
      // of silently reading the wrong mailbox
      if (
        body.user_email &&
        body.user_email.toLowerCase() !== user.email.toLowerCase()
      ) {
        return new Response(
          JSON.stringify({ error: "user_email does not match authenticated user" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Get messages request for authenticated user:", user.email);

      // Get all conversations for the authenticated user
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select(`
          *,
          messages (*)
        `)
        .eq("customer_email", user.email)
        .order("last_message_at", { ascending: false });

      if (convError) {
        console.error("Error fetching conversations:", convError);
        throw convError;
      }

      // Count unread messages
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in(
          "conversation_id",
          conversations?.map((c) => c.id) || []
        )
        .eq("sender_type", "admin")
        .is("read_at", null);

      return new Response(
        JSON.stringify({ conversations, unread_count: unreadCount || 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (req.method === "POST" && action === "mark-read") {
      // Identity comes from the caller's JWT, not the request body (IDOR fix)
      const user = await getAuthenticatedUser(req);
      if (!user?.email) return unauthorized();

      const body: MarkReadRequest = await req.json();
      console.log("Mark read request from", user.email, ":", body.message_ids);

      if (!Array.isArray(body.message_ids) || body.message_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: "message_ids required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Only messages inside the authenticated user's own conversations
      // can be marked read — arbitrary message_ids for other users are ignored
      const { data: ownConversations, error: ownConvError } = await supabase
        .from("conversations")
        .select("id")
        .eq("customer_email", user.email);

      if (ownConvError) {
        console.error("Error fetching user conversations:", ownConvError);
        throw ownConvError;
      }

      const ownConversationIds = ownConversations?.map((c) => c.id) || [];

      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", body.message_ids)
        .in("conversation_id", ownConversationIds);

      if (error) {
        console.error("Error marking messages as read:", error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Message API error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
