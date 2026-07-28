// ---------------------------------------------------------------------------
// QA scoring bands.
//
// `processing_templates.qa_threshold` is the per-template pass mark (column
// added in migration 20260211120000 with DEFAULT 70, and it is editable from
// Settings -> Processing Templates). It is the ONLY per-mission QA override the
// admin portal has: the other one, `customers.qa_threshold_adjustment`, hangs
// off the legacy `customers` table that this redesign stopped joining, and it
// is read only by the drone-qa-analyze edge function.
//
// Every admin surface that colours a QA score used to hardcode 75/50, so a
// template configured to 85 (or 60) was displayed against 75 anyway — the
// override was fetched, printed on the mission page, and then ignored by the
// thing it was supposed to control. These helpers are the one place that band
// is computed, so the grid, the mission list and the detail page agree.
//
// Two different numbers live here and must not be conflated:
//
//   * the per-template pass mark, used whenever a threshold is actually
//     available, and
//   * the FALLBACK band, used when there is none — a mission with no
//     `processing_template_id`, a query that did not embed the template, or a
//     template whose nullable `qa_threshold` was cleared in Settings ->
//     Processing Templates.
//
// The fallback is the legacy hardcoded band those call sites replaced: pass
// >= 75, warn >= 50. It is deliberately NOT the column's DB default (70): that
// default only decides what a template ROW gets when inserted without a value,
// which says nothing about how to colour a mission that has no template at all.
// Falling back to 70 turned scores in [70,75) from amber to green and [47,50)
// from red to amber, which on a vertical whose missions carry no template read
// as a permanently green band.
// ---------------------------------------------------------------------------

/**
 * Pass mark used when no template threshold is available. This is the value the
 * call sites hardcoded before this module existed (`score >= 75` -> green), not
 * the DB default for `processing_templates.qa_threshold`, which is 70.
 */
export const DEFAULT_QA_THRESHOLD = 75;

/**
 * Warn line used for scores below the pass mark (`score >= 50` -> amber). Like
 * the pass mark this is a literal carried over from the original call sites,
 * not a ratio of the threshold: the old code wrote two independent constants,
 * so a stricter template raises the green line without dragging the red line up
 * with it. Any scaling rule invented here would silently change the amber/red
 * boundary for every template that is not set to exactly 75.
 *
 * A template with a pass mark at or below this floor simply has no amber band —
 * `qaVerdict` tests the pass mark first, so the warn branch is unreachable.
 */
export const QA_WARN_FLOOR = 50;

export type QaVerdict = "pass" | "warn" | "fail";

/** Resolves the effective pass mark, falling back to the legacy 75 pass mark. */
export function effectiveQaThreshold(threshold?: number | null): number {
  return typeof threshold === "number" && Number.isFinite(threshold)
    ? threshold
    : DEFAULT_QA_THRESHOLD;
}

/** Where a score lands relative to the template's pass mark. Null score -> null. */
export function qaVerdict(
  score: number | null | undefined,
  threshold?: number | null
): QaVerdict | null {
  if (score == null || !Number.isFinite(score)) return null;
  const pass = effectiveQaThreshold(threshold);
  if (score >= pass) return "pass";
  if (score >= QA_WARN_FLOOR) return "warn";
  return "fail";
}

const VERDICT_TEXT_CLASS: Record<QaVerdict, string> = {
  pass: "text-green-600",
  warn: "text-amber-600",
  fail: "text-red-600",
};

/** Tailwind text colour for a score, or the muted colour when there is none. */
export function qaScoreColor(
  score: number | null | undefined,
  threshold?: number | null
): string {
  const verdict = qaVerdict(score, threshold);
  return verdict ? VERDICT_TEXT_CLASS[verdict] : "text-muted-foreground";
}
