// ---------------------------------------------------------------------------
// Job archive — one rule, used everywhere a list of jobs is shown.
//
// `drone_jobs.archived_at` is NULL for a live job and a timestamp for an
// archived one. Archiving hides a job from lists, dashboards and the CRM state
// snapshot. It deletes nothing and leaves `status` alone, so restoring a job is
// a single column going back to NULL.
// ---------------------------------------------------------------------------

export interface Archivable {
  archived_at?: string | null;
}

export function isArchived(job: Archivable): boolean {
  return !!job.archived_at;
}

/** The mission list shows one view at a time: live jobs, or archived jobs. Never a mix. */
export function jobsInView<T extends Archivable>(jobs: T[], showArchived: boolean): T[] {
  return jobs.filter((job) => isArchived(job) === showArchived);
}

/** The column values that archive or restore a job. `now` is injectable for tests. */
export function archivePatch(
  archive: boolean,
  reason = "Archived from the mission list.",
  now: Date = new Date()
): { archived_at: string | null; archive_reason: string | null } {
  return archive
    ? { archived_at: now.toISOString(), archive_reason: reason }
    : { archived_at: null, archive_reason: null };
}
