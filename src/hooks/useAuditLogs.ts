// ============================================
// AUDIT LOGGING UTILITY
// ============================================
// Routes audit events through activity_events table

import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEvent {
  action: 'created' | 'updated' | 'deleted';
  tableName: string;
  recordId: string;
  changesBefore?: Record<string, unknown>;
  changesAfter?: Record<string, unknown>;
  notes?: string;
}

/**
 * Log an audit event to activity_events table (fire-and-forget)
 */
export async function logAuditEvent(event: AuditLogEvent): Promise<void> {
  try {
    await supabase.from("activity_events").insert({
      event_type: `audit.${event.action}`,
      description: `${event.action.toUpperCase()} on ${event.tableName}:${event.recordId}${event.notes ? ` — ${event.notes}` : ""}`,
      metadata: {
        table: event.tableName,
        record_id: event.recordId,
        before: event.changesBefore ?? null,
        after: event.changesAfter ?? null,
      },
    });
  } catch {
    // Fire-and-forget — don't break the calling flow
  }
}

export default { logAuditEvent };
