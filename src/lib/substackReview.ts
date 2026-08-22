import { supabase } from "@/integrations/supabase/client";

export const REVIEW_EMAIL = "dradamopierce@gmail.com" as const;

export type ReviewIntent = "approve" | "changes";

export type SubstackReview = Readonly<{
  id: string;
  draft_id: string;
  version: number;
  status:
    | "pending_review"
    | "approved"
    | "publishing"
    | "published"
    | "verification_failed";
  selected_headline: string;
  subtitle: string;
  article_markdown: string;
  notes_teaser: string;
  subscribe_call: string;
  content_hash: string;
  expires_at: string;
  requested_changes: string | null;
  published_url: string | null;
}>;

type FunctionError = Readonly<{
  message?: string;
  context?: { status?: number } | Response;
}>;

type FunctionResult<T> = Readonly<{
  data: T | null;
  error: FunctionError | null;
}>;

export type ReviewInvoker = <T>(
  name: string,
  options: { body: unknown },
) => Promise<FunctionResult<T>>;

export class SubstackReviewError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SubstackReviewError";
    this.status = status;
  }
}

export function isApprovedReviewer(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === REVIEW_EMAIL;
}

export function parseReviewIntent(value: string | null): ReviewIntent | null {
  return value === "approve" || value === "changes" ? value : null;
}

function errorStatus(error: FunctionError | null): number {
  if (!error?.context) return 500;
  return typeof error.context.status === "number" ? error.context.status : 500;
}

function safeErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return "Sign in again to review this draft.";
    case 403:
      return `Use ${REVIEW_EMAIL} to review this draft.`;
    case 409:
      return "This review version is no longer active.";
    case 410:
      return "This review link has expired.";
    default:
      return "The review service is unavailable. Try again later.";
  }
}

const defaultInvoker: ReviewInvoker = async <T>(name: string, options: { body: unknown }) => {
  const result = await supabase.functions.invoke(name, options);
  return result as unknown as FunctionResult<T>;
};

async function invokeReview<T>(
  requestBody: unknown,
  invoke: ReviewInvoker = defaultInvoker,
): Promise<T> {
  const { data, error } = await invoke<T>("substack-review", {
    body: requestBody,
  });
  if (error || data === null) {
    const status = errorStatus(error);
    throw new SubstackReviewError(safeErrorMessage(status), status);
  }
  return data;
}

export async function loadSubstackReview(
  token: string,
  invoke?: ReviewInvoker,
): Promise<SubstackReview> {
  const data = await invokeReview<{ review: SubstackReview }>(
    { action: "load", token },
    invoke,
  );
  return data.review;
}

export async function requestSubstackChanges(
  token: string,
  changes: string,
  invoke?: ReviewInvoker,
): Promise<{ status: string }> {
  return await invokeReview<{ status: string }>(
    { action: "request_changes", token, changes },
    invoke,
  );
}

export async function approveSubstackReview(
  input: Readonly<{
    token: string;
    version: number;
    contentHash: string;
  }>,
  invoke?: ReviewInvoker,
): Promise<{ status: string; idempotent: boolean }> {
  return await invokeReview<{ status: string; idempotent: boolean }>(
    {
      action: "approve",
      token: input.token,
      version: input.version,
      content_hash: input.contentHash,
      confirm_publish: true,
    },
    invoke,
  );
}
