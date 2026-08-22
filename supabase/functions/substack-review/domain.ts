export const APPROVED_REVIEW_EMAIL = "dradamopierce@gmail.com";

export type ReviewStatus =
  | "pending_review"
  | "changes_requested"
  | "superseded"
  | "approved"
  | "publishing"
  | "published"
  | "verification_failed"
  | "expired";

export type ApprovalDisposition =
  | "approve"
  | "already_approved"
  | "conflict";

type ReviewSnapshot = Readonly<{
  status: ReviewStatus;
  version: number;
  contentHash: string;
}>;

type RequestedSnapshot = Readonly<{
  version: number;
  contentHash: string;
}>;

const LEGAL_TRANSITIONS: Readonly<
  Record<ReviewStatus, readonly ReviewStatus[]>
> = {
  pending_review: ["changes_requested", "approved", "expired", "superseded"],
  changes_requested: ["superseded"],
  superseded: [],
  approved: ["publishing", "superseded"],
  publishing: ["published", "verification_failed"],
  published: [],
  verification_failed: ["publishing"],
  expired: [],
};

const ACTIVE_STATUSES: ReadonlySet<ReviewStatus> = new Set([
  "pending_review",
  "approved",
  "publishing",
  "verification_failed",
]);

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function assertTransition(from: ReviewStatus, to: ReviewStatus): void {
  if (!LEGAL_TRANSITIONS[from].includes(to)) {
    throw new Error(`Illegal review transition: ${from} to ${to}`);
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const hashReviewToken = sha256Hex;
export const hashReviewContent = sha256Hex;

export function isExpired(expiresAt: string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function isActiveVersion(status: ReviewStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function getApprovalDisposition(
  current: ReviewSnapshot,
  requested: RequestedSnapshot,
): ApprovalDisposition {
  const exactSnapshot = current.version === requested.version &&
    current.contentHash === requested.contentHash;

  if (!exactSnapshot) return "conflict";
  if (current.status === "pending_review") return "approve";
  if (current.status === "approved") return "already_approved";
  return "conflict";
}
