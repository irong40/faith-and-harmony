/**
 * Safety Audit Logging — FAA Compliance
 *
 * Records safety-critical pilot actions to the safety_audit_log table.
 * All records are tied to mission_id for audit trail.
 *
 * Event types:
 * - weather_briefing:       Pilot completed weather briefing (GO/CAUTION/NO_GO)
 * - weather_refresh:        Pilot refreshed METAR during pre-flight
 * - weather_override:       Pilot overrode NO_GO or CAUTION determination
 * - tfr_review:             Pilot confirmed airspace/TFR check
 * - checklist_complete:     Pilot completed pre-flight SOP checklist
 * - preflight_gate_blocked: Pre-flight step blocked due to stale/missing data
 * - final_gate_weather:     Weather age checked at final Log Flight gate
 */

import { supabase } from '@/integrations/supabase/client';

export type SafetyEventType =
  | 'weather_briefing'
  | 'weather_refresh'
  | 'weather_override'
  | 'tfr_review'
  | 'checklist_complete'
  | 'preflight_gate_blocked'
  | 'final_gate_weather';

export interface SafetyAuditPayload {
  missionId: string;
  pilotId: string;
  eventType: SafetyEventType;
  eventData?: Record<string, unknown>;
  notes?: string;
}

/**
 * Log a safety-critical action to the database.
 * Fails silently — safety logging must never block the user operation.
 */
export async function logSafetyEvent(payload: SafetyAuditPayload): Promise<void> {
  try {
    const { error } = await supabase.from('safety_audit_log').insert({
      mission_id: payload.missionId,
      pilot_id: payload.pilotId,
      event_type: payload.eventType,
      event_data: payload.eventData ?? null,
      notes: payload.notes ?? null,
    });

    if (error) {
      console.warn('[SafetyAudit] Failed to log event:', error.message);
    }
  } catch (err) {
    // Never throw — audit logging must not block pilot operations
    console.warn('[SafetyAudit] Exception logging event:', (err as Error).message);
  }
}

/**
 * Log weather briefing saved (GO/CAUTION/NO_GO determination).
 */
export function logWeatherBriefing(
  missionId: string,
  pilotId: string,
  data: {
    determination: string;
    station: string;
    isOverride: boolean;
    overrideReason?: string | null;
  }
) {
  return logSafetyEvent({
    missionId,
    pilotId,
    eventType: data.isOverride ? 'weather_override' : 'weather_briefing',
    eventData: {
      determination: data.determination,
      station: data.station,
      pilot_override: data.isOverride,
      override_reason: data.overrideReason ?? null,
    },
    notes: data.isOverride
      ? `Pilot override: ${data.overrideReason}`
      : `Weather determination: ${data.determination}`,
  });
}

/**
 * Log weather refresh action (pilot re-fetched METAR).
 */
export function logWeatherRefresh(
  missionId: string,
  pilotId: string,
  data: { station: string; previousAgeMinutes: number }
) {
  return logSafetyEvent({
    missionId,
    pilotId,
    eventType: 'weather_refresh',
    eventData: {
      station: data.station,
      previous_age_minutes: Math.round(data.previousAgeMinutes),
    },
    notes: `Refreshed METAR at ${data.station} (previous data was ${Math.round(data.previousAgeMinutes)} min old)`,
  });
}

/**
 * Log TFR/airspace review confirmation.
 */
export function logTfrReview(
  missionId: string,
  pilotId: string,
  data: {
    airspaceClass: string;
    requiresLaanc: boolean;
    activeTfrCount: number;
  }
) {
  return logSafetyEvent({
    missionId,
    pilotId,
    eventType: 'tfr_review',
    eventData: {
      airspace_class: data.airspaceClass,
      requires_laanc: data.requiresLaanc,
      active_tfr_count: data.activeTfrCount,
    },
    notes: `Airspace Class ${data.airspaceClass} confirmed, ${data.activeTfrCount} active TFR(s)`,
  });
}

/**
 * Log pre-flight checklist completion.
 */
export function logChecklistComplete(
  missionId: string,
  pilotId: string,
  data: { itemCount: number; weatherDetermination?: string }
) {
  return logSafetyEvent({
    missionId,
    pilotId,
    eventType: 'checklist_complete',
    eventData: {
      item_count: data.itemCount,
      weather_determination: data.weatherDetermination ?? null,
    },
    notes: `Pre-flight checklist completed (${data.itemCount} items)`,
  });
}

/**
 * Log that the final flight gate checked weather and found it acceptable.
 */
export function logFinalWeatherGate(
  missionId: string,
  pilotId: string,
  data: { ageMinutes: number; determination: string }
) {
  return logSafetyEvent({
    missionId,
    pilotId,
    eventType: 'final_gate_weather',
    eventData: {
      weather_age_minutes: Math.round(data.ageMinutes),
      determination: data.determination,
    },
    notes: `Final gate: weather ${Math.round(data.ageMinutes)} min old, ${data.determination}`,
  });
}
