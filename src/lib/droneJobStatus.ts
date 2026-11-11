import type { Database } from '@/integrations/supabase/types';

/**
 * One status map for every pilot-facing view of a drone job.
 *
 * Background: MissionCard, PilotMissionDetail and the pilot map each kept their
 * own four-key map (scheduled, captured, complete, cancelled). Five pilot jobs in
 * `photos_delivered` crashed /pilot with "Cannot read properties of undefined
 * (reading 'color')", and the detail and map pages labelled them SCHEDULED.
 *
 * Typed as a Record over the enum, so tsc fails if a new enum value is added
 * without an entry here.
 */
export type DroneJobStatus = Database['public']['Enums']['drone_job_status'];

export interface StatusBadge {
  label: string;
  /** Tailwind background class for the badge. */
  color: string;
  /** Hex color for map markers. */
  hex: string;
}

const BLUE = { color: 'bg-blue-500', hex: '#3b82f6' };
const ORANGE = { color: 'bg-orange-500', hex: '#f97316' };
const PURPLE = { color: 'bg-purple-500', hex: '#a855f7' };
const YELLOW = { color: 'bg-yellow-500', hex: '#eab308' };
const GREEN = { color: 'bg-green-500', hex: '#22c55e' };
const RED = { color: 'bg-red-500', hex: '#ef4444' };
const GRAY = { color: 'bg-gray-500', hex: '#6b7280' };

export const DRONE_JOB_STATUS_BADGES: Record<DroneJobStatus, StatusBadge> = {
  intake: { label: 'INTAKE', ...BLUE },
  scheduled: { label: 'SCHEDULED', ...BLUE },
  captured: { label: 'IN PROGRESS', ...ORANGE },
  uploaded: { label: 'UPLOADED', ...PURPLE },
  ingested: { label: 'INGESTED', ...PURPLE },
  processing: { label: 'PROCESSING', ...PURPLE },
  review_pending: { label: 'REVIEW PENDING', ...YELLOW },
  qa: { label: 'QA', ...YELLOW },
  revision: { label: 'REVISION', ...YELLOW },
  video_grading: { label: 'VIDEO GRADING', ...PURPLE },
  video_editing: { label: 'VIDEO EDITING', ...PURPLE },
  video_exporting: { label: 'VIDEO EXPORTING', ...PURPLE },
  photos_delivered: { label: 'PHOTOS DELIVERED', ...GREEN },
  delivered: { label: 'DELIVERED', ...GREEN },
  complete: { label: 'COMPLETE', ...GREEN },
  paid: { label: 'PAID', ...GREEN },
  failed: { label: 'FAILED', ...RED },
  cancelled: { label: 'CANCELLED', ...GRAY },
};

/** Neutral badge for a status this map does not know, labelled from the raw text. */
const NEUTRAL = { color: 'bg-slate-400', hex: '#94a3b8' };

export function getStatusBadge(status: string | null | undefined): StatusBadge {
  if (status && Object.prototype.hasOwnProperty.call(DRONE_JOB_STATUS_BADGES, status)) {
    return DRONE_JOB_STATUS_BADGES[status as DroneJobStatus];
  }
  const raw = (status ?? '').trim();
  const label = raw ? raw.replace(/[_-]+/g, ' ').toUpperCase() : 'UNKNOWN';
  return { label, ...NEUTRAL };
}
