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
// ---------------------------------------------------------------------------

/** DB default for `processing_templates.qa_threshold`. */
export const DEFAULT_QA_THRESHOLD = 70;

/**
 * The old hardcoded band was pass >= 75, warn >= 50. Keeping warn at two thirds
 * of the pass mark reproduces that spacing for any threshold instead of pinning
 * the warn line to a number that only made sense when pass was 75.
 */
const WARN_RATIO = 50 / 75;

export type QaVerdict = "pass" | "warn" | "fail";

/** Resolves the effective pass mark, falling back to the column default. */
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
  if (score >= Math.round(pass * WARN_RATIO)) return "warn";
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
