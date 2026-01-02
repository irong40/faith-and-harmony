// ============================================
// AUDIT LOGGING UTILITY
// ============================================
// Simple audit logging for tracking admin actions
// Can be enhanced later with dedicated audit_logs table

export interface AuditLogEvent {
  action: 'created' | 'updated' | 'deleted';
  tableName: string;
  recordId: string;
  changesBefore?: Record<string, unknown>;
  changesAfter?: Record<string, unknown>;
  notes?: string;
}

/**
 * Log an audit event
 * Currently logs to console - can be extended to write to database
 */
export async function logAuditEvent(event: AuditLogEvent): Promise<void> {
  const timestamp = new Date().toISOString();
  
  console.log(`[AUDIT] ${timestamp} | ${event.action.toUpperCase()} on ${event.tableName}:${event.recordId}`);
  
  if (event.notes) {
    console.log(`[AUDIT] Notes: ${event.notes}`);
  }
  
  if (event.changesBefore) {
    console.log(`[AUDIT] Before:`, event.changesBefore);
  }
  
  if (event.changesAfter) {
    console.log(`[AUDIT] After:`, event.changesAfter);
  }
}

// Export for compatibility with useMissionControlAdmin
export default { logAuditEvent };