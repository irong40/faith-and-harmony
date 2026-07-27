import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import {
  executeSync,
  isFreshSyncTimestamp,
  validateSyncPayload,
  verifySyncSignature,
  type CommandCenterSyncPayload,
  type SyncDepartmentInsert,
  type SyncRunRecord,
  type SyncStore,
  type SyncWorkInsert,
} from "../_shared/command-center-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-command-center-signature, x-command-center-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function message(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "Command center sync failed";
}

function createStore(payload: CommandCenterSyncPayload): SyncStore {
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  return {
    async findExistingWork(sourceRefs) {
      if (!sourceRefs.length) return [];
      const { data, error } = await client
        .from("work_items")
        .select("source_ref, title")
        .eq("source_system", payload.source)
        .in("source_ref", sourceRefs);
      if (error) throw error;
      return (data ?? []).filter((row) => row.source_ref !== null) as Array<{ source_ref: string; title: string }>;
    },

    async findExistingDepartments(sourceRefs) {
      if (!sourceRefs.length) return [];
      const { data, error } = await client
        .from("department_updates")
        .select("source_ref, summary")
        .eq("source_system", payload.source)
        .in("source_ref", sourceRefs);
      if (error) throw error;
      return (data ?? []).filter((row) => row.source_ref !== null) as Array<{ source_ref: string; summary: string }>;
    },

    async insertWork(rows: SyncWorkInsert[]) {
      const { error } = await client.from("work_items").insert(rows);
      if (error) throw error;
    },

    async insertDepartments(rows: SyncDepartmentInsert[]) {
      const { error } = await client.from("department_updates").insert(rows);
      if (error) throw error;
    },

    async recordRun(run: SyncRunRecord) {
      const { error } = await client.from("sync_runs").insert(run);
      if (error) throw error;
    },
  };
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const timestamp = request.headers.get("x-command-center-timestamp") ?? "";
  const signature = request.headers.get("x-command-center-signature") ?? "";
  const secret = Deno.env.get("COMMAND_CENTER_SYNC_SECRET") ?? "";
  if (!isFreshSyncTimestamp(timestamp)) return json({ error: "Unauthorized" }, 401);

  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return json({ error: "Payload too large" }, 413);
  if (!await verifySyncSignature(rawBody, timestamp, signature, secret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let input: unknown;
  try {
    input = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const validation = validateSyncPayload(input);
  if (!validation.valid) return json({ error: "Invalid sync payload", issues: validation.issues }, 400);
  if (validation.value.work_items.length + validation.value.department_updates.length > 250) {
    return json({ error: "A sync run can propose at most 250 records" }, 400);
  }

  try {
    const result = await executeSync(validation.value, createStore(validation.value));
    return json({ success: true, ...result });
  } catch (error) {
    const errorText = message(error);
    try {
      const client = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      await client.from("sync_runs").insert({
        direction: "vault_to_crm",
        status: "failed",
        proposed_count: validation.value.work_items.length + validation.value.department_updates.length,
        applied_count: 0,
        skipped_count: 0,
        error: errorText,
        metadata: { mode: validation.value.mode, source: validation.value.source },
        completed_at: new Date().toISOString(),
      });
    } catch {
      // Preserve the original error response even when audit logging is unavailable.
    }
    return json({ error: errorText }, 500);
  }
}

serve(handleRequest);
