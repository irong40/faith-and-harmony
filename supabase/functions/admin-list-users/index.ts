import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        // 1. Verify the caller is an admin
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "No authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Create a client with the user's JWT to verify their identity
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } },
        });

        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Check if user has 'admin' role in user_roles table
        // We can use the service role for this check if RLS prevents the user from seeing their own role (unlikely, but safe)
        // Or just use the user's client if they have read access.
        // Let's use service role to be sure we can check roles reliably.
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { data: roles, error: rolesError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "admin");

        if (rolesError || !roles || roles.length === 0) {
            return new Response(JSON.stringify({ error: "Unauthorized: Admin access required" }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Fetch all users using the Service Role
        // supabase.auth.admin.listUsers()
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
        });

        if (listError) {
            throw listError;
        }

        // 3. Return the users (id, email, user_metadata)
        // Map to a clean structure
        const cleanedUsers = users.map((u) => ({
            id: u.id,
            email: u.email,
            full_name: u.user_metadata?.full_name || u.user_metadata?.name || "",
            created_at: u.created_at,
        }));

        return new Response(JSON.stringify({ users: cleanedUsers }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
